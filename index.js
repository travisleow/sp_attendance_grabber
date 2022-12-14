const puppeteer = require("puppeteer");
require("dotenv").config();
const axios = require('axios')

async function get_captcha(image_data) {
    image_data = image_data.replace(
        /^data:image\/(png|jpg|jpeg|gif);base64,/,
        ""
    );

    const captcha_response = await axios({
        method: 'post',
        url: "https://api.apitruecaptcha.org/one/gettext",
        data: {
            userid: process.env.TRUECAPTCHA_USERID,
            apikey: process.env.TRUECAPTCHA_APIKEY,
            data: image_data,
        }
    }).then((res) => {return res.data.result});

    return captcha_response;
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
        try {
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
            const captcha_result = await get_captcha(img_data);
            console.log("Done! Captcha: " + captcha_result);
            await page.type("#captchaText", captcha_result);
            await page.evaluate(`document.querySelector("#Submit").click()`);
            console.log("Loading into attendance page... (Can take up to 1min)");
            await page.waitForNavigation({ timeout: 60000 });
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
            console.log("---------------------------------------------")
            for (module of modules) {
                console.log(`${module.name} - ${module.rate}`);
            }
            console.log("---------------------------------------------")

            browser.close();
        } catch (err) {
            console.log("Something wrong happened");
        }
    }
}

main();
