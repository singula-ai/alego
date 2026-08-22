# Alego Badge

Add the official “powered by alego” badge without recreating or restyling it.

## Assets

- Local PNG: [`alego-badge.png`](alego-badge.png), 726×120 source image; render at 121×20
- Shields.io image URL: `https://img.shields.io/badge/powered_by-alego-F5A524?style=flat-square`
- Project URL: `https://github.com/singula-ai/alego`

## Markdown

Use this linked badge in Markdown:

```markdown
[![](https://img.shields.io/badge/powered_by-alego-F5A524?style=flat-square)](https://github.com/singula-ai/alego)
```

If attribution should not be linked, use:

```markdown
![](https://img.shields.io/badge/powered_by-alego-F5A524?style=flat-square)
```

## Usage rules

- For GitHub or GitLab Markdown, use the Shields.io URL and link it to the project URL unless the user asks for an unlinked image.
- For Feishu and other systems that import remote images unreliably, upload `alego-badge.png` from this skill directory instead of generating another badge.
- Preserve the badge's 121×20 dimensions and aspect ratio.
- Place the badge at the end of the attributed document or section unless the user specifies another position.
- Do not substitute another color, logo, label, or project URL.
