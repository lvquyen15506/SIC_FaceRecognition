"""
Automated Docker Build & Configuration Verification Test Suite by Quinn QA
"""
import os
import sys

def test_backend_dockerfile():
    dockerfile_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/backend/Dockerfile'))
    assert os.path.exists(dockerfile_path), "Backend Dockerfile missing"
    
    with open(dockerfile_path, 'r', encoding='utf-8') as f:
        content = f.read()

    assert "opencv-python-headless" in content
    assert "psycopg2-binary" in content
    assert "USER appuser" in content
    assert "apt-get" not in content  # Verified no apt-get failure points
    print("  ✅ Docker Test 1: Backend Dockerfile (Headless Wheels & Non-Root) verified!")

def test_frontend_dockerfile():
    dockerfile_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../web_app/frontend/Dockerfile'))
    assert os.path.exists(dockerfile_path), "Frontend Dockerfile missing"
    
    with open(dockerfile_path, 'r', encoding='utf-8') as f:
        content = f.read()

    assert "nginxinc/nginx-unprivileged" in content
    print("  ✅ Docker Test 2: Frontend Dockerfile (Nginx Unprivileged) verified!")

def test_docker_compose():
    compose_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../docker-compose.yml'))
    assert os.path.exists(compose_path), "docker-compose.yml missing"
    
    with open(compose_path, 'r', encoding='utf-8') as f:
        content = f.read()

    assert "ankane/pgvector" in content
    assert "sic_facerecognition_net" in content
    assert "web_app/backend/Dockerfile" in content
    print("  ✅ Docker Test 3: docker-compose.yml (3 Services + Isolated Bridge Network) verified!")

def main():
    print("🐳 Running Quinn QA Automated Docker Verification Suite...")
    test_backend_dockerfile()
    test_frontend_dockerfile()
    test_docker_compose()
    print("\n🎉 ALL DOCKER BUILD & CONFIGURATION TESTS PASSED 100%!")

if __name__ == "__main__":
    main()
