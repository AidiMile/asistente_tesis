FROM python:3.11-slim
ARG INSTALL_ML=false
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 SQL_DIR=/app/database
WORKDIR /app
COPY backend/requirements.txt backend/requirements-ml.txt ./
RUN pip install -r requirements.txt && \
    if [ "$INSTALL_ML" = "true" ]; then pip install -r requirements-ml.txt; fi
COPY backend/ /app/
COPY database/ /app/database/
EXPOSE 8000
CMD ["./start.sh"]
