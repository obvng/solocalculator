import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p", "br", "h2", "h3", "h4", "h5", "h6", "strong", "em", "u", "s", "code", "pre",
  "ul", "ol", "li", "blockquote", "hr", "a", "img", "figure", "figcaption", "table", "thead",
  "tbody", "tr", "th", "td", "div", "span", "iframe",
];

export function sanitizeArticleHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "target", "rel", "class"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      iframe: ["src", "title", "width", "height", "allow", "allowfullscreen", "loading"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      div: ["class"],
      span: ["class"],
      code: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"], iframe: ["https"] },
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "player.vimeo.com"],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          ...(attribs.target === "_blank" ? { rel: attribs.rel || "noopener noreferrer" } : {}),
        },
      }),
      img: (_tagName, attribs) => ({ tagName: "img", attribs: { ...attribs, loading: attribs.loading || "lazy" } }),
    },
    exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src,
    disallowedTagsMode: "discard",
  });
}
