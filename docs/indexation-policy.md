# Indexation policy

This document defines the public indexation rules for catalogue, search, and future editorial taxonomy pages.

| URL type | Robots | Canonical |
| --- | --- | --- |
| `/buy` and `/rent` | `index, follow` | Self |
| Clean pagination such as `/buy?page=2` | `index, follow` | The exact pagination URL |
| Any catalogue filter, sort, tracking, unknown, duplicated, or invalid query combination | `noindex, follow` | The base `/buy` or `/rent` route |
| `/search` with or without a query | `noindex, follow` | `/search` |

Page 1 is represented by the base route. Existing URL normalization redirects an explicit `page=1`, invalid pagination, and normalized filter values to their canonical form. Filtered pagination remains canonical to the unfiltered base catalogue rather than creating an indexable page series.

## Editorial designer and silhouette landing pages

A designer or silhouette may be indexable only through a dedicated stable route with self-canonical metadata and substantive unique editorial content. A query-string filter is never treated as an editorial landing page.

Before an editorial landing page is made indexable, it must have:

- a unique title, heading, and useful descriptive copy;
- a stable slug and self-canonical URL;
- relevant public dresses returned through the authoritative catalogue rules;
- no invented claims, availability, pricing, reviews, or business details.

A dedicated page without unique content must remain `noindex, follow` and must not be added to a sitemap. Creating those routes and their editorial CMS workflow is outside Task 34.
