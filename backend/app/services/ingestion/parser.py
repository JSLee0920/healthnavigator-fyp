from unstructured.partition.auto import partition
from unstructured.chunking.title import chunk_by_title
import xml.etree.ElementTree as ET
from pathlib import Path

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
            print(f"Using unstructured.io for {filename}...")
            return cls._parse_with_unstructured(file_path, filename)

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
    def _parse_with_unstructured(file_path: Path, filename: str) -> list[dict]:
        """Uses Unstructured for PDFs with memory-safe semantic chunking."""

        # Force the "fast" strategy to prevent Unstructured from launching
        raw_elements = partition(filename=str(file_path), strategy="fast")

        # Add boundary limits to chunk_by_title.
        # This prevents massive chapters from becoming single, oversized chunks
        chunked_elements = chunk_by_title(
            raw_elements,
            combine_text_under_n_chars=500,  # Group tiny paragraphs together
            max_characters=1500,  # Hard cap chunk size (keeps embeddings safe)
            new_after_n_chars=1000,  # Soft split preference
            overlap=200,  # Retain 200 chars of context between chunks
        )

        structured_chunks = []
        for chunk in chunked_elements:
            text = chunk.text.strip()
            if not text:
                continue

            metadata = {
                "source": filename,
                "filetype": getattr(chunk.metadata, "filetype", "unknown"),
                "page_number": getattr(chunk.metadata, "page_number", None),
            }
            structured_chunks.append(
                {
                    "text": text,
                    "metadata": {k: v for k, v in metadata.items() if v is not None},
                }
            )

        print(f"Extraction complete. Yielded {len(structured_chunks)} semantic chunks.")
        return structured_chunks
