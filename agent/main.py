"""Compatibility entrypoint for ``uv run python main.py``."""

from writing_agent.server.main import connection_handler, main

if __name__ == "__main__":
    main()
