from flask import Flask, jsonify, request
from flask_cors import CORS
from copy import deepcopy
import os

from seed_data import STUDENTS, ENROLMENTS

app = Flask(__name__)

_ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "")
CORS(app, origins=[_ALLOWED_ORIGIN] if _ALLOWED_ORIGIN else [])

VERSION = os.getenv("APP_VERSION", "2.0.0")
_API_KEY = os.getenv("API_KEY", "")


@app.before_request
def require_api_key():
    if request.path == "/health":
        return
    if request.method not in ("GET", "HEAD", "OPTIONS") and \
            request.headers.get("X-API-Key") != _API_KEY:
        return jsonify({"error": "Unauthorized"}), 401


students   = deepcopy(STUDENTS)
enrolments = deepcopy(ENROLMENTS)
_counter   = [len(STUDENTS) + 1]


@app.route("/health")
def health():
    return jsonify({"status": "healthy", "service": "student-service", "version": VERSION}), 200


@app.route("/api/students", methods=["GET"])
def list_students():
    return jsonify(students), 200


@app.route("/api/students", methods=["POST"])
def create_student():
    data  = request.get_json(force=True) or {}
    name  = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    if not name or not email:
        return jsonify({"error": "name and email are required"}), 400
    student = {
        "id":        f"STU{_counter[0]:03d}",
        "name":      name,
        "email":     email,
        "year":      int(data.get("year", 1)),
        "programme": data.get("programme", "Cloud Engineering"),
        "status":    data.get("status", "Active"),
    }
    _counter[0] += 1
    students.append(student)
    return jsonify(student), 201


@app.route("/api/students/<sid>", methods=["GET"])
def get_student(sid):
    student = next((s for s in students if s["id"] == sid), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    return jsonify(student), 200


@app.route("/api/students/<sid>", methods=["PUT"])
def update_student(sid):
    student = next((s for s in students if s["id"] == sid), None)
    if not student:
        return jsonify({"error": "Student not found"}), 404
    data = request.get_json(force=True) or {}
    for field in ("name", "email", "year", "programme", "status"):
        if field in data:
            student[field] = data[field]
    return jsonify(student), 200


@app.route("/api/students/<sid>", methods=["DELETE"])
def delete_student(sid):
    global students
    if not any(s["id"] == sid for s in students):
        return jsonify({"error": "Student not found"}), 404
    students = [s for s in students if s["id"] != sid]
    return jsonify({"message": f"Student {sid} deleted"}), 200


@app.route("/api/students/<sid>/enrolments", methods=["GET"])
def student_enrolments(sid):
    result = [e for e in enrolments if e["studentId"] == sid]
    return jsonify(result), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
# trigger
