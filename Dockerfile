FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    QT_QPA_PLATFORM=xcb \
    QT_PLUGIN_PATH=/opt/ODAFileConverter/plugins \
    LD_LIBRARY_PATH=/opt/ODAFileConverter/lib:/opt/ODAFileConverter/bin \
    ODA_EXEC_PATH=/opt/ODAFileConverter/bin/ODAFileConverter

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    xvfb \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download and extract ODA File Converter AppImage
RUN curl -sL -o /tmp/ODA.AppImage \
    "https://www.opendesign.com/guestfiles/get?filename=ODAFileConverter_QT6_lnxX64_8.3dll_27.1.AppImage" \
    && chmod a+x /tmp/ODA.AppImage \
    && cd /tmp && /tmp/ODA.AppImage --appimage-extract > /dev/null 2>&1 \
    && mkdir -p /opt/ODAFileConverter \
    && mv /tmp/squashfs-root/usr/bin /opt/ODAFileConverter/bin \
    && mv /tmp/squashfs-root/usr/plugins /opt/ODAFileConverter/plugins \
    && mv /tmp/squashfs-root/usr/lib /opt/ODAFileConverter/lib \
    && rm -rf /tmp/squashfs-root /tmp/ODA.AppImage \
    # Test that the binary is executable
    && /opt/ODAFileConverter/bin/ODAFileConverter --help > /dev/null 2>&1 || true

# Install Python packages
RUN pip3 install --break-system-packages --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    ezdxf \
    python-multipart \
    Pillow

WORKDIR /app
COPY backend/ /app/

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
