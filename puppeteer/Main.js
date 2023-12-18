import puppeteer from 'puppeteer';
import sqlite3 from 'sqlite3';

class SearchQuery {
	constructor(query, type, fields, physicField, startDate, endDate, year, results, ShowAbstract) {
		this.query = query;
		this.type = type;
		this.fields= fields;
		this.physicField = physicField;
		this.startDate = startDate;
		this.endDate = endDate;
		this.year = year;
		this.results = results;
		this.ShowAbstract = ShowAbstract;
	}
}

async function PreformSearch(query) {
	// Launch the browser and open a new blank page
	const browser = await puppeteer.launch({headless: false});
	const page = await browser.newPage();
	page.setJavaScriptEnabled(true);
	page.setCacheEnabled(true);
  
	// Navigate the page to a URL
	await page.goto('https://arxiv.org');
  
	// Set screen size
	await page.setViewport({width: 1080, height: 1024});  

	// Click on advanced search
	const AdvancedSearch = await page.$x("//a[contains(text(), 'Advanced Search')]");
	await Promise.all([
		await AdvancedSearch[0].click(),
		page.waitForNavigation({ waitUntil: 'networkidle0' }),
	]);
	console.log("Advanced Search clicked");

	//get input "terms-0-term"
	await page.type("#terms-0-term", query.query);

	console.log("Search term inserted");

	//get combobox "terms-0-field"
	await page.select("#terms-0-field", query.type);

	console.log("Field to search selected");

	//loop over fields
	for (let i = 0; i < query.fields.length; i++) {
		await page.click("#classification-"+query.fields[i]);
	}

	console.log("Fields selected");

	//get combobox "classification-physics_archives"
	await page.select("#classification-physics_archives", query.physicField);

	console.log("Physics archives selected");

	if(query.startDate != null && query.endDate != null) {
		//get input "date-filter_by-3"
		await page.click("#date-filter_by-3");

		//get input "date-from_date"
		await page.type("#date-from_date", query.startDate);
		
		//get input "date-to_date"
		await page.type("#date-to_date", query.endDate);		
	}

	console.log("Start and end date selected");

	if(query.year != null) {
		//get input "date-filter_by-2"
		await page.click("#date-filter_by-2");
		//get input "date-year"
		await page.type("#date-year", query.year);
		console.log("Year selected");
	}

	if(query.ShowAbstract) {
		//get input "abstracts-0"
		await page.click("#abstracts-0");
		console.log("Abstract selected");
		
	}else{
		//get input "abstracts-1"
		await page.click("#abstracts-1");
		console.log("Abstract not selected");
	}

	if(query.results != null) {
		//get combobox "size"
		await page.select("#size", query.results);
		console.log("Results selected");
	}

	//get button containing text "Search"
	const search = await page.$eval("button[class='button is-link is-medium']", elem => elem.click());

	await page.waitForNavigation({ waitUntil: 'networkidle0' });
	console.log("Search clicked");


	//find all hrefs named pdf
	const pdfs = await page.evaluate(() => {
		let links = [];
		let elements2 = document.querySelectorAll('a');
		for (let element2 of elements2){
		  if(element2.href.includes("pdf")){
			links.push(element2.href);
		  }
		}
		return links;
	  });
	browser.close();
	return pdfs;
}

function InsertToDB(hrefs) {
	let db = new sqlite3.Database('./arxiv.db', (err) => {
		if (err) {
			console.error(err.message);
		}else{
			console.log('Connected to the arxiv database.');
		}
	});

	db.serialize(function () {
		db.run("CREATE TABLE IF NOT EXISTS arxiv (id INTEGER PRIMARY KEY, href TEXT)");
		let stmt = db.prepare("INSERT INTO arxiv (href) VALUES (?)");
		for (let i = 0; i < hrefs.length; i++) {
			stmt.run(hrefs[i]);
		}
		stmt.finalize();
	});

	db.close();
}

const AvailTypes = ["title", "abstract", "author", "comments", "journal_ref", "report_num", "acm_class", "msc_class", "report_num", "paper-id", "cross-list-catagory", "doi", "orcid", "author-id", "all"];
const AvailFields = ["computer_science", "economics", "eess", "mathematics", "physics", "q_biology", "q_finance", "statistics"];
const AvailPhysicFields = ["astro-ph", "cond-mat", "gr-qc", "hep-ex", "hep-lat", "hep-ph", "hep-th", "math-ph", "nlin", "nucl-ex", "nucl-th", "physics", "quant-ph"];

(async () => {
	//graph theory computer science from 2019 to 2022 with 100 results dont show abstract
	const query = new SearchQuery("Graph Theory", AvailTypes[AvailTypes.length - 1], [AvailFields[0]], AvailPhysicFields[0], "2019-01-01", "2022-01-01", null, "100", false);
	let hrefs=await PreformSearch(query);
	console.log(hrefs);
	await InsertToDB(hrefs);
})();