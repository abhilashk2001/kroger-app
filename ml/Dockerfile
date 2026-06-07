# Image for the offline ML jobs. Not started by `docker compose up` (it sits behind
# a Compose profile); it is run on demand, e.g.:
#   docker compose run --rm ml python basket_analysis.py
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# The source is also bind-mounted in compose for dev, but copy it so the image is
# runnable on its own too.
COPY . .

# Default to an interactive shell; real runs override the command.
CMD ["bash"]
