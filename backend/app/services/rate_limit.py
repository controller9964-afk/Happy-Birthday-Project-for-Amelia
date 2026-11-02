import time
from collections import defaultdict, deque


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self.events: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        if len(self.events) > 10_000:
            expired = [
                event_key
                for event_key, timestamps in self.events.items()
                if not timestamps or now - timestamps[-1] >= self.window_seconds
            ]
            for event_key in expired:
                del self.events[event_key]
        events = self.events[key]
        while events and now - events[0] >= self.window_seconds:
            events.popleft()
        if len(events) >= self.limit:
            return False
        events.append(now)
        return True
