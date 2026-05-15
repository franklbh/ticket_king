from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/shows", tags=["shows"])

# Add more shows here as new projects launch
SHOWS = [
    {
        "id": "terracotta-warriors-vr",
        "title": "Terracotta Warriors VR",
        "slug": "terracotta-warriors-vr",
        "description": "Step into ancient China with our immersive VR experience of the Terracotta Warriors.",
        "duration_minutes": 45,
        "ticket_types": [
            {"id": "adult",  "label": "Adult",                      "off_peak_cad": 37.95, "peak_cad": 45.95},
            {"id": "child",  "label": "Child (7–15)",               "off_peak_cad": 27.95, "peak_cad": 34.95},
            {"id": "senior", "label": "Senior (65+)",               "off_peak_cad": 34.95, "peak_cad": 41.95},
            {"id": "family", "label": "Family (2 adults + 1 child)","off_peak_cad": 31.95, "peak_cad": 39.95},
            {"id": "group",  "label": "Group (6+ people)",          "off_peak_cad": 32.95, "peak_cad": 40.95},
        ],
    },
]

_shows_by_id = {s["id"]: s for s in SHOWS}


@router.get("")
def list_shows():
    return SHOWS


@router.get("/{show_id}")
def get_show(show_id: str):
    show = _shows_by_id.get(show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    return show
