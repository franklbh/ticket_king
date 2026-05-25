-- Auto-coupon that backs the combo discount (reuses existing coupon infrastructure)
INSERT INTO coupons (code, source, discount_type, discount_value, min_purchase, max_uses, used_count, total_amount, valid_from, valid_to, status, remarks, created_at, updated_at)
VALUES (
    'COMBO-VR-GAME',
    'automatic',
    'percent',
    10,
    0,
    NULL,
    0,
    0,
    CURRENT_DATE,
    '2099-12-31',
    'active',
    'Auto-applied when cart has VR show + arcade game',
    NOW(),
    NOW()
);

-- Combo rules stored in DB so admin can toggle or adjust slugs without code changes
CREATE TABLE combo_promotions (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    coupon_code      TEXT NOT NULL,
    show_event_slugs JSONB NOT NULL DEFAULT '[]',
    game_event_slugs JSONB NOT NULL DEFAULT '[]',
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO combo_promotions (name, coupon_code, show_event_slugs, game_event_slugs)
VALUES (
    'VR Show + Game Combo',
    'COMBO-VR-GAME',
    '["panda-vr", "dino-vr"]',
    '["game-a", "game-b", "game-c"]'
);
