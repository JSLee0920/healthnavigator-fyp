from unstructured.partition.auto import partition
from unstructured.chunking.title import chunk_by_title
import xmltodict
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
            print(f"Using surgical XML extraction for {filename}...")
            return cls._parse_medline_xml(file_path, filename)

        else:
            print(f"Using unstructured.io for {filename}...")
            return cls._parse_with_unstructured(file_path, filename)

    @staticmethod
    def _parse_medline_xml(file_path: Path, filename: str) -> list[dict]:
        """Surgically extracts only the Title and Abstract from Medline XML, ignoring author/journal metadata."""
        with open(file_path, "r", encoding="utf-8") as file:
            data_dict = xmltodict.parse(file.read())

        chunks = []
        try:
            articles = data_dict.get("PubmedArticleSet", {}).get("PubmedArticle", [])
            if not isinstance(articles, list):
                articles = [articles]

            for article in articles:
                medline = article.get("MedlineCitation", {}).get("Article", {})
                title = medline.get("ArticleTitle", "No Title")
                abstract = medline.get("Abstract", {}).get("AbstractText", "")

                if isinstance(abstract, list):
                    abstract = " ".join(
                        [
                            sec.get("#text", "")
                            for sec in abstract
                            if isinstance(sec, dict)
                        ]
                    )
                elif isinstance(abstract, dict):
                    abstract = abstract.get("#text", "")

                if abstract:
                    chunks.append(
                        {
                            "text": f"{title}\n\n{abstract}",
                            "metadata": {
                                "source": filename,
                                "type": "medline_abstract",
                            },
                        }
                    )
        except Exception as e:
            print(f"XML Parsing Error: {e}")

        print(f"XML Extraction complete. Yielded {len(chunks)} clinical abstracts.")
        return chunks

    @staticmethod
    def _parse_with_unstructured(file_path: Path, filename: str) -> list[dict]:
        """Uses Unstructured for PDFs and Excel files with semantic chunking."""
        raw_elements = partition(filename=str(file_path))
        chunked_elements = chunk_by_title(raw_elements)

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
