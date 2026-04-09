import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_student
from app.models.user import User
from app.models.learning import LearningModule
from app.models.learning_progress import StudentLearningProgress
from app.models.enums import LearningStatus, LearningCategory
from app.services.student_service import get_or_create_profile
from app.exceptions import NotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/learning", tags=["learning"])


@router.get("/modules")
async def list_modules(
    category: LearningCategory | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    query = db.query(LearningModule)
    if category:
        query = query.filter(LearningModule.category == category)
    total = query.count()
    modules = query.offset(skip).limit(limit).all()
    return {
        "modules": [
            {
                "id": m.id,
                "title": m.title,
                "category": m.category.value,
                "difficulty": m.difficulty,
                "duration_minutes": m.duration_minutes,
                "tags": m.tags,
            }
            for m in modules
        ],
        "total": total,
    }


@router.get("/modules/{module_id}")
async def get_module(
    module_id: int,
    db: Session = Depends(get_db),
) -> dict:
    module = db.query(LearningModule).filter(LearningModule.id == module_id).first()
    if not module:
        raise NotFoundError("Learning module")
    return {
        "id": module.id,
        "title": module.title,
        "category": module.category.value,
        "difficulty": module.difficulty,
        "content_text": module.content_text,
        "content_url": module.content_url,
        "duration_minutes": module.duration_minutes,
        "tags": module.tags,
    }


@router.get("/recommended")
async def recommended_modules(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    from app.models.readiness import PlacementReadiness
    readiness = (
        db.query(PlacementReadiness)
        .filter(PlacementReadiness.student_id == profile.id)
        .first()
    )

    categories = []
    if readiness and readiness.weak_areas:
        category_map = {
            "communication": LearningCategory.communication,
            "technical": LearningCategory.technical,
            "confidence": LearningCategory.behavioral,
            "structure": LearningCategory.hr,
        }
        for area in readiness.weak_areas:
            if area in category_map:
                categories.append(category_map[area])

    if not categories:
        categories = list(LearningCategory)

    modules = (
        db.query(LearningModule)
        .filter(LearningModule.category.in_(categories))
        .limit(10)
        .all()
    )
    return {
        "weak_areas": readiness.weak_areas if readiness else [],
        "recommended": [
            {"id": m.id, "title": m.title, "category": m.category.value, "duration_minutes": m.duration_minutes}
            for m in modules
        ],
    }


@router.post("/modules/{module_id}/start")
async def start_module(
    module_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    module = db.query(LearningModule).filter(LearningModule.id == module_id).first()
    if not module:
        raise NotFoundError("Learning module")

    progress = (
        db.query(StudentLearningProgress)
        .filter(StudentLearningProgress.student_id == profile.id, StudentLearningProgress.module_id == module_id)
        .first()
    )
    if not progress:
        progress = StudentLearningProgress(
            student_id=profile.id,
            module_id=module_id,
            status=LearningStatus.in_progress,
            started_at=datetime.now(timezone.utc),
        )
        db.add(progress)
    else:
        progress.status = LearningStatus.in_progress
    db.commit()
    return {"message": "Module started", "module_id": module_id}


@router.post("/modules/{module_id}/complete")
async def complete_module(
    module_id: int,
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    progress = (
        db.query(StudentLearningProgress)
        .filter(StudentLearningProgress.student_id == profile.id, StudentLearningProgress.module_id == module_id)
        .first()
    )
    if not progress:
        raise NotFoundError("Module progress — start the module first")
    progress.status = LearningStatus.completed
    progress.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Module completed", "module_id": module_id}


@router.get("/progress")
async def learning_progress(
    user: User = Depends(require_student),
    db: Session = Depends(get_db),
) -> dict:
    profile = get_or_create_profile(db, user)
    progress_items = (
        db.query(StudentLearningProgress)
        .filter(StudentLearningProgress.student_id == profile.id)
        .all()
    )
    completed = sum(1 for p in progress_items if p.status == LearningStatus.completed)
    return {
        "total_started": len(progress_items),
        "completed": completed,
        "in_progress": len(progress_items) - completed,
        "items": [
            {"module_id": p.module_id, "status": p.status.value, "started_at": str(p.started_at), "completed_at": str(p.completed_at) if p.completed_at else None}
            for p in progress_items
        ],
    }
