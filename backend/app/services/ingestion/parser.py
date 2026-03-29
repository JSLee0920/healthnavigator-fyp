import xmltodict
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent.parent.parent.parent / "data" / "raw_data"


class HealthcareDataParser:
    @staticmethod
    def parse_xml_dataset(filename: str):
        file_path = DATA_DIR / filename
        if not file_path.exists():
            raise FileNotFoundError(f"Data not found at {file_path}")

        with open(file_path, "r", encoding="utf-8") as file:
            data_dict = xmltodict.parse(file.read())

        chunks = []
        try:
            articles = data_dict.get("PubmedArticleSet", {}).get("PubmedArticle", [])
            if not isinstance(articles, list):
                articles = [articles]

            for article in articles:
                medline_citation = article.get("MedlineCitation", {})
                article_data = medline_citation.get("Article", {})
                title = article_data.get("ArticleTitle", "No Title")
                abstract = article_data.get("Abstract", {}).get("AbstractText", "")

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
                            "text": f"Title: {title}\nAbstract: {abstract}",
                            "metadata": {"title": title, "source": filename},
                        }
                    )
        except Exception as e:
            print(f"Error parsing dataset: {e}")
        return chunks
