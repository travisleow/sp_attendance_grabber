const puppeteer = require("puppeteer");
require("dotenv").config();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const config = process.argv.slice(2)[0];
if (config === "test") {
    main();
}

async function get_captcha(image_data) {
    let captcha;
    image_data = image_data.replace(
        /^data:image\/(png|jpg|jpeg|gif);base64,/,
        ""
    );
    const params = {
        userid: process.env.TRUECAPTCHA_USERID,
        apikey: process.env.TRUECAPTCHA_APIKEY,
        data: image_data,
    };
    const url = "https://api.apitruecaptcha.org/one/gettext";

    await fetch(url, {
        method: "post",
        body: JSON.stringify(params),
    })
        .then((response) => response.json())
        .then((data) => captcha = data);
    return captcha;
}


function cleanBase64(base64) {
    return base64.replace(/^data:image\/(png|jpg|gif|jpeg);base64,/, "");
}


async function main() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(
        "https://mysas2.sp.edu.sg/psc/csprdstu/EMPLOYEE/SA/c/A_STDNT_ATTENDANCE.A_ATT_SUMM_STDNT.GBL"
    );
    await page.type("#userid", process.env.STUDENT_ID, {delay: 50});
    await page.type("#pwd", process.env.PASSWORD, {delay: 50});
    const data_url = await page.evaluate(() => {
        const img = document.getElementById("ImgCaptcha");
        var canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        return canvas.toDataURL("image/png");
    });

    const img_data = cleanBase64(data_url);
    console.log("Getting captcha text...")
    const captcha_result = await get_captcha(img_data).then((data) => {return data.result});
    console.log("Done! Captcha: " + captcha_result);
    await page.type("#captchaText", captcha_result, {delay: 50});
    await page.evaluate(`document.querySelector("#Submit").click()`);
    console.log("Loading into attendance page...")
    await page.waitForNavigation({timeout: 0});
    console.log("Loaded! Getting attendance info...")
    const modules = await page.$$eval(`.PSLEVEL1GRIDWBO tr[id*="trA_STU_ATT_TBL$0"]`, (elements) => elements.map(e => ({
        name: e.querySelector('td:nth-child(2) > div > span').innerText,
        rate: e.querySelector('td:nth-child(3) > div > span').innerText
    })))
    for (module of modules) {
        console.log(`Module Name: ${module.name}, Rate: ${module.rate}`);
    }

    browser.close()
}

async function old() {
    try {
        const browser = await puppeteer.launch({
            headless: false,
        });
        const page = await browser.newPage();
        await page.goto(
            "https://portal.sp.edu.sg/sites/eservices/HomePage.aspx"
        );
        await page.evaluate(
            `document.querySelector("#ctl00_SPWebPartManager1_g_b90c73c4_af32_4a95_b9c7_a89e627f454f_ctl00_divCollapse > div:nth-child(3) > div.service-header-collapse").click()`
        );
        await page.evaluate(
            `document.querySelector("#service2 > div > div:nth-child(3) > span.service-title-collapse > a").click()`
        );
        await sleep(500);
        await page.bringToFront();
        await page.type("#userid", "test comment", { delay: 200 });
    } catch (err) {
        console.error(err);
    }
}
