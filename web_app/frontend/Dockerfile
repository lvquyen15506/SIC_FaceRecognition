# Production-Hardened Non-Root Frontend Dockerfile for SIC_FaceRecognition
FROM nginxinc/nginx-unprivileged:alpine

COPY --chown=101:101 . /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
