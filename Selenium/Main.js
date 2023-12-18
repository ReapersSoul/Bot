const webdriver = require('selenium-webdriver');
const { By, Builder } = webdriver;

const AvailTypes = ["title", "abstract", "author", "comments", "journal_ref", "report_num", "acm_class", "msc_class", "report_num", "paper-id", "cross-list-catagory", "doi", "orcid", "author-id", "all"];
const AvailFields = ["computer_science", "economics", "eess", "mathematics", "physics", "q_biology", "q_finance", "statistics"];
const AvailPhysicFields = ["astro-ph", "cond-mat", "gr-qc", "hep-ex", "hep-lat", "hep-ph", "hep-th", "math-ph", "nlin", "nucl-ex", "nucl-th", "physics", "quant-ph"];

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
	let driver = await new Builder().forBrowser('chrome').build();
    await driver.get('https://arxiv.org');

	// Click on advanced search
	let AdvancedSearch = await driver.findElement(By.linkText("Advanced Search"));
	await AdvancedSearch.click();

	//get input "terms-0-term"
	let SearchTerm = await driver.findElement(By.id("terms-0-term"));
	await SearchTerm.sendKeys(query.query);

	//get combobox "terms-0-field"
	let FieldToSearch = await driver.findElement(By.name("terms-0-field"));
	await FieldToSearch.findElement(By.css("option[value='" + query.type + "']")).click();

	//loop over fields
	for (let i = 0; i < query.fields.length; i++) {
		let Field = await driver.findElement(By.id("classification-"+query.fields[i]));
		await Field.click();
	}

	//get combobox "classification-physics_archives"
	let PhysicsArchives = await driver.findElement(By.id("classification-physics_archives"));
	await driver.executeScript("arguments[0].value = arguments[1]", PhysicsArchives, query.physicField);

	if(query.startDate != null && query.endDate != null) {
	//get input "date-filter_by-3"
	let StartDate = await driver.findElement(By.id("date-filter_by-3"));
	await StartDate.click();

	//get input "date-from_date"
	let FromDate = await driver.findElement(By.id("date-from_date"));
	await FromDate.sendKeys(query.startDate);

	//get input "date-to_date"
	let ToDate = await driver.findElement(By.id("date-to_date"));
	await ToDate.sendKeys(query.endDate);
	}

	if(query.year != null) {
		//get input "date-filter_by-2"
		let Year = await driver.findElement(By.id("date-filter_by-2"));
		await Year.click();

		//get input "date-year"
		let YearInput = await driver.findElement(By.id("date-year"));
		await YearInput.sendKeys(query.year);
	}

	if(query.ShowAbstract) {
		//get input "abstracts-0"
		let Abstract = await driver.findElement(By.id("abstracts-0"));
		await Abstract.click();
	}else{
		//get input "abstracts-1"
		let Abstract = await driver.findElement(By.id("abstracts-1"));
		await Abstract.click();
	}

	if(query.results != null) {
		//get combobox "size"
		let Results = await driver.findElement(By.id("size"));
		await Results.findElement(By.css("option[value='" + query.results + "']")).click();
	}

	//get button "Search"
	let Search = await driver.findElement(By.className("button is-link is-medium"));
	await Search.click();

	//find all hrefs named pdf
	let pdfs = await driver.findElements(By.linkText("pdf"));
	let hrefs = [];
	for (let i = 0; i < pdfs.length; i++) {
		hrefs.push(await pdfs[i].getAttribute("href"));
	}
	await driver.quit();
	return hrefs;
}

const sqlite3 = require('sqlite3').verbose();

function InsertToDB(hrefs) {
	let db = new sqlite3.Database('arxiv.db', (err) => {
		if (err) {
			console.error(err.message);
		}
		console.log('Connected to the arxiv database.');
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

(async function helloSelenium() {
	//graph theory computer science from 2019 to 2022 with 100 results dont show abstract
	const query = new SearchQuery("Graph Theory", AvailTypes[AvailTypes.length - 1], [AvailFields[0]], AvailPhysicFields[0], "2019-01-01", "2022-01-01", null, 100, false);
	let hrefs=await PreformSearch(query);
	console.log(hrefs);
	await InsertToDB(hrefs);
})();
