@echo off
echo Building EWA Viewer backend Docker image...
docker build -t ewa-viewer-backend .

echo.
echo Starting container on port 8002...
docker run -it --rm -p 8002:8002 -v "%CD%\uploads:/app/uploads" ewa-viewer-backend
