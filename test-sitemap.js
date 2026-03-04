const { SitemapLoader } = require('@langchain/community/document_loaders/web/sitemap');
async function test() {
  const loader = new SitemapLoader("https://hidayahcentre.org.my/page-sitemap.xml"); // let's see if this exists, or maybe we just check their site
  console.log('trying to load...');
  try {
    const docs = await loader.load();
    console.log(`Found ${docs.length} docs`);
  } catch (e) {
    console.error(e.message);
  }
}
test();
