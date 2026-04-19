"""Dodo Payments integration — checkout sessions and webhooks."""
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.auth.dependencies import get_current_active_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

# Plan → Dodo product mapping (set these in your Dodo dashboard)
PLAN_PRODUCTS = {
    "pro_candidate": {
        "product_id": "prod_pro_candidate",  # Replace with your Dodo product ID
        "price_inr": 399,
        "name": "Pro Candidate - ₹399/month",
    },
    "company_starter": {
        "product_id": "prod_company_starter",
        "price_inr": 7999,
        "name": "Company Starter - ₹7,999/month",
    },
    "company_growth": {
        "product_id": "prod_company_growth",
        "price_inr": 24999,
        "name": "Company Growth - ₹24,999/month",
    },
}


@router.post("/create-checkout")
async def create_checkout(
    plan_key: str,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Create a Dodo Payments checkout session for a plan upgrade."""
    if plan_key not in PLAN_PRODUCTS:
        return JSONResponse(status_code=400, content={"detail": f"Unknown plan: {plan_key}"})

    product = PLAN_PRODUCTS[plan_key]

    if not settings.DODO_PAYMENTS_API_KEY:
        # Dev mode — skip payment, directly upgrade
        from app.services.subscription_service import set_user_plan
        set_user_plan(db, user.id, plan_key)
        return {
            "mode": "dev",
            "message": f"Plan upgraded to {product['name']} (payment skipped — no API key configured)",
            "redirect_url": None,
        }

    try:
        from dodopayments import DodoPayments

        client = DodoPayments(
            bearer_token=settings.DODO_PAYMENTS_API_KEY,
            environment=settings.DODO_PAYMENTS_ENV,
        )

        checkout = client.checkout_sessions.create(
            product_cart=[{"product_id": product["product_id"], "quantity": 1}],
            payment_link=True,
            customer={
                "email": user.email,
                "name": user.full_name or user.email,
            },
            metadata={
                "user_id": str(user.id),
                "plan_key": plan_key,
            },
            success_url=f"{settings.FRONTEND_URL}/payment/success?plan={plan_key}",
            cancel_url=f"{settings.FRONTEND_URL}/pricing",
        )

        logger.info("Checkout session created for user %s, plan %s", user.id, plan_key)
        return {
            "mode": "live",
            "session_id": checkout.session_id,
            "redirect_url": checkout.url,
        }

    except Exception as e:
        logger.error("Dodo checkout failed: %s", repr(e))
        return JSONResponse(status_code=500, content={"detail": f"Payment service error: {str(e)}"})


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    """Dodo Payments webhook — handles payment success."""
    try:
        body = await request.json()
        event_type = body.get("type", "")
        data = body.get("data", {})

        logger.info("Webhook received: %s", event_type)

        if event_type in ("payment.completed", "checkout.completed"):
            metadata = data.get("metadata", {})
            user_id = metadata.get("user_id")
            plan_key = metadata.get("plan_key")

            if user_id and plan_key:
                from app.services.subscription_service import set_user_plan
                set_user_plan(db, int(user_id), plan_key)
                logger.info("Plan upgraded via webhook: user=%s plan=%s", user_id, plan_key)

        return {"status": "ok"}

    except Exception as e:
        logger.error("Webhook processing failed: %s", repr(e))
        return {"status": "error", "detail": str(e)}


@router.post("/confirm")
async def confirm_payment(
    plan_key: str,
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Called after successful payment redirect — confirms and upgrades plan.
    In dev mode (no API key), this directly upgrades the plan.
    In production, the webhook handles it, but this is a safety fallback."""
    from app.services.subscription_service import set_user_plan, get_usage_summary
    set_user_plan(db, user.id, plan_key)
    summary = get_usage_summary(db, user.id)
    return {"message": f"Plan upgraded to {summary['plan_name']}", "plan": summary}
