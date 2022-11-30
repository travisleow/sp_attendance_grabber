const puppeteer = require("puppeteer");
require("dotenv").config();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// const config = process.argv.slice(2)[0];
// if (config === "test") {
//     main();
// }

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
        .then((data) => (captcha = data));
    return captcha;
}

function cleanBase64(base64) {
    return base64.replace(/^data:image\/(png|jpg|gif|jpeg);base64,/, "");
}

async function main() {
    if (
        !process.env.STUDENT_ID ||
        !process.env.PASSWORD ||
        !process.env.TRUECAPTCHA_APIKEY ||
        !process.env.TRUECAPTCHA_USERID
    ) {
        console.log("Missing .env variables");
    } else {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto(
            "https://mysas2.sp.edu.sg/psc/csprdstu/EMPLOYEE/SA/c/A_STDNT_ATTENDANCE.A_ATT_SUMM_STDNT.GBL"
        );
        await page.type("#userid", process.env.STUDENT_ID);
        await page.type("#pwd", process.env.PASSWORD);
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
        console.log("Getting captcha text...");
        const captcha_result = await get_captcha(img_data).then((data) => {
            return data.result;
        });
        console.log("Done! Captcha: " + captcha_result);
        await page.type("#captchaText", captcha_result);
        await page.evaluate(`document.querySelector("#Submit").click()`);
        console.log("Loading into attendance page...");
        await page.waitForNavigation({ timeout: 0 });
        console.log("Loaded! Getting attendance info...\n");
        const modules = await page.$$eval(
            `.PSLEVEL1GRIDWBO tr[id*="trA_STU_ATT_TBL$0"]`,
            (elements) =>
                elements.map((e) => ({
                    name: e.querySelector("td:nth-child(2) > div > span")
                        .innerText,
                    rate: e.querySelector("td:nth-child(3) > div > span")
                        .innerText,
                }))
        );
        for (module of modules) {
            console.log(`Module: ${module.name} - ${module.rate}`);
        }

        browser.close();
    }
}

main();
