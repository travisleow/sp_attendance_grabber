const puppeteer = require('puppeteer');
require('dotenv').config();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const config = process.argv.slice(2)[0];
if (config === "test") {
    main()
}

function get_captcha(image_data, callback){
	image_data = image_data.replace(/^data:image\/(png|jpg|jpeg|gif);base64,/, "")
	const params = {			
		userid: process.env.TRUECAPTCHA_USERID,
		apikey: process.env.TRUECAPTCHA_APIKEY,
		data: image_data,
	}
	const url = "https://api.apitruecaptcha.org/one/gettext"

	fetch(url, {
		method: 'post', 
		body: JSON.stringify(params)
	})
	.then((response) => response.json())
	.then((data) => callback(data));
}

// get_captcha((result)=> {
//     console.log(result)
// });

async function main() {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    await page.goto('https://mysas2.sp.edu.sg/psc/csprdstu/EMPLOYEE/SA/c/A_STDNT_ATTENDANCE.A_ATT_SUMM_STDNT.GBL');
    await page.type('#userid', process.env.STUDENT_ID);
    await page.type('#pwd', process.env.PASSWORD)
    await page.evaluate(`document.getElementById('ImgCaptcha')`).then(data => {console.log(data)})
}


async function old() {
    try {
        const browser = await puppeteer.launch({
        headless: false,
        });
        const page = await browser.newPage();
        await page.goto('https://portal.sp.edu.sg/sites/eservices/HomePage.aspx');
        await page.evaluate(`document.querySelector("#ctl00_SPWebPartManager1_g_b90c73c4_af32_4a95_b9c7_a89e627f454f_ctl00_divCollapse > div:nth-child(3) > div.service-header-collapse").click()`);
        await page.evaluate(`document.querySelector("#service2 > div > div:nth-child(3) > span.service-title-collapse > a").click()`);
        await sleep(500);
        await page.bringToFront()
        await page.type('#userid', 'test comment', {delay: 200})
        
        
    } catch (err) {
        console.error(err)
    }
}