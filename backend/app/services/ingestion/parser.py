import xml.etree.ElementTree as ET
from pathlib import Path
from langchain_community.document_loaders import PyMuPDFLoader

DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "data" / "raw_data"


class UniversalDataParser:
    @classmethod
    def load_file(cls, filename: str) -> list[dict]:
        file_path = DATA_DIR / filename

        if not file_path.exists():
            raise FileNotFoundError(f"Dataset not found at {file_path}")

        ext = file_path.suffix.lower()

        if ext == ".xml":
            print(f"Using fast XML extraction for {filename}...")
            return cls._parse_medline_xml(file_path, filename)

        else:
            print(f"Using PyMuPDF for {filename}...")
            return cls._parse_pdf(file_path, filename)

    @staticmethod
    def _parse_medline_xml(file_path: Path, filename: str) -> list[dict]:
        """Fast XML extraction for MedlinePlus Health Topics."""
        tree = ET.parse(file_path)
        root = tree.getroot()

        chunks = []

        for topic in root.findall("health-topic"):
            title = topic.get("title", "No Title")

            summary_element = topic.find("full-summary")

            if summary_element is not None:
                content = " ".join(summary_element.itertext()).strip()
            else:
                content = topic.get("meta-desc", "")

            # Grab aliases for the Knowledge Graph
            aliases = [
                alias.text for alias in topic.findall("also-called") if alias.text
            ]
            if aliases:
                content += f"\nAlso Known As: {', '.join(aliases)}"

            # Append as a dictionary so the Embedder doesn't crash
            if content.strip():
                chunks.append(
                    {
                        "text": f"Topic: {title}\nSummary: {content}",
                        "metadata": {
                            "source": filename,
                            "url": topic.get("url", "unknown"),
                            "topic_id": topic.get("id", "unknown"),
                        },
                    }
                )

        print(f"XML Extraction complete. Yielded {len(chunks)} clinical abstracts.")
        return chunks

    @staticmethod
    def _parse_pdf(file_path: Path, filename: str) -> list[dict]:
        """PyMUPDF for parsing complex pdfs"""
        loader = PyMuPDFLoader(str(file_path))
        docs = loader.load()

        structured_chunks = []
        for doc in docs:
            text = doc.page_content.strip()
            if not text:
                continue

            structured_chunks.append(
                {
                    "text": text,
                    "metadata": {
                        "source": filename,
                        # PyMuPDF is 0-indexed, add 1 for actual page numbers
                        "page_number": doc.metadata.get("page", 0) + 1,
                    },
                }
            )

        print(
            f"PDF Extraction complete. Yielded {len(structured_chunks)} pages of text."
        )
        return structured_chunks
