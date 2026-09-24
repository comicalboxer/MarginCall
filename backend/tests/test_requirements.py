from pathlib import Path


def test_python_package_versions_are_compatible_with_supported_python():
    requirements_path = Path(__file__).resolve().parents[1] / "requirements.txt"
    requirements = requirements_path.read_text(encoding="utf-8")

    assert "numpy" in requirements
    assert "scipy" in requirements
    assert "numpy==2.1.2" in requirements
    assert "scipy==1.15.3" in requirements
