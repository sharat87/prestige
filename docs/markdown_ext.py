import re

from markdown.extensions import Extension
from markdown.preprocessors import Preprocessor
from markdown.treeprocessors import Treeprocessor
from markdown.inlinepatterns import SimpleTagInlineProcessor


class ImageLinks(Preprocessor):
    def run(self, lines):
        new_lines = []
        i_max = len(lines) - 1

        for i, line in enumerate(lines):
            if (i == 0 or not lines[i - 1]) and (i == i_max or not lines[i + 1]):
                match = re.match(r"^!\[.+?\]\((.+?)\)$", line)
                if match:
                    new_lines.append("[" + line + "](" + match.group(1) + ")")
                    new_lines.append("{: .img }")
                    continue

            new_lines.append(line)

        return new_lines


class ExternalLinks(Treeprocessor):
    def run(self, root):
        for el in root.iter("a"):
            href = el.attrib["href"]
            if href and re.match(r"^https?://", href):
                el.attrib.update(rel="noopener noreferrer", target="_blank")


class PrestigeDocsExt(Extension):
    def extendMarkdown(self, md):
        # Ref: <https://python-markdown.github.io/extensions/api/>.
        md.preprocessors.register(ImageLinks(md), 'img_links', 200)
        md.treeprocessors.register(ExternalLinks(md), 'ext_links', 20)
        md.inlinePatterns.register(SimpleTagInlineProcessor(r'()~~(.+?)~~', 'del'), 'del', 175)
        md.inlinePatterns.register(SimpleTagInlineProcessor(r'()\(\((.+?)\)\)', 'kbd'), 'kbd', 175)


# This function will be called by python-markdown to get an instance of the extension.
def makeExtension(**kwargs):
    return PrestigeDocsExt(**kwargs)
