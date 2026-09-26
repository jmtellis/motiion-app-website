# Google Search setup for Motiion

## Search Console status — September 25, 2026

- Domain property `motiion.app` added to the signed-in account; Google automatically verified ownership through the domain provider. No DNS edits were needed.
- URL Inspection confirms `https://www.motiion.app/` is indexed and on Google.
- Submitted `https://www.motiion.app/sitemap.xml`. Google accepted the submission but currently reports "Sitemap could not be read". A direct public request returns HTTP 200 and XML, including with a Googlebot user-agent; this does not prove that Google itself can fetch it. Recheck after deployment and investigate hosting crawler/firewall logs if the error persists.
- Search Console is still processing performance and indexing report data.
- Website SEO changes are still local; request a homepage recrawl after deployment.

## Publish first

Deploy the website changes before asking Google to recrawl. They add WebSite and Organization structured data to the homepage, a clear brand title and description, homepage and marketing-page canonical links, and a cleaned sitemap. The homepage retains its custom sharing image.

## Connect Search Console

1. Open https://search.google.com/search-console and sign in with the Google account that should own the website property.
2. Select Add property, choose Domain, and enter `motiion.app` (two i's; no https or www).
3. Copy Google's TXT verification record. Add it to the domain's DNS provider, using the root host (`@` or blank, depending on the provider) and Google's exact value. Preserve existing records.
4. Return to Google and click Verify. DNS changes can take time; leave the record in place after verification.
5. Under Sitemaps, submit `https://www.motiion.app/sitemap.xml`.
6. Use URL Inspection for `https://www.motiion.app/`, test the live URL, and request indexing after deployment. Repeat for `/pricing` if needed.
7. Review Page indexing for problems and Performance for queries containing `motiion` over time. Indexing, ranking, and spelling suggestions remain Google's decisions.

## Alternative when DNS access is unavailable

Create a URL-prefix property for `https://www.motiion.app/`. Choose HTML tag verification. Set `GOOGLE_SITE_VERIFICATION` in the production hosting environment to only the `content` value from Google's tag, redeploy, then click Verify. This code supports that tag, but no verification token has been supplied yet.

## Follow-up brand signals

The footer's social links are currently placeholders. Once the official profile URLs are confirmed, connect those links and add the verified profiles to the Organization data. Do not invent social profiles. Ensure official social and App Store listings link to the same website and consistently spell the name Motiion.

## References

- Site names: https://developers.google.com/search/docs/appearance/site-names
- Verification: https://support.google.com/webmasters/answer/9008080
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Recrawling: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
