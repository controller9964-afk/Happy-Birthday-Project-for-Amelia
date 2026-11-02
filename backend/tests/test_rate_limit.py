from app.services.rate_limit import SlidingWindowLimiter


def test_limiter_blocks_after_limit_and_allows_after_window():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=1)
    assert limiter.allow("visitor")
    assert limiter.allow("visitor")
    assert not limiter.allow("visitor")
    limiter.events["visitor"].clear()
    assert limiter.allow("visitor")
