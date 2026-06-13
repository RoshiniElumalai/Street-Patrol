const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const ExcelJS = require('exceljs');

async function runTests() {
  console.log("Starting Selenium E2E Tests...");
  let options = new chrome.Options();
  options.addArguments('--ignore-certificate-errors');
  // options.addArguments('--headless'); // Commented out so you can see the "live" automation
  
  let driver;
  try {
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  } catch (err) {
    console.error("Could not start Chrome Driver. Make sure Chrome is installed.");
    console.error(err);
    return;
  }

  const results = [];
  
  const addResult = (name, pass, err = '') => {
    results.push({ testCase: name, status: pass ? 'PASS' : 'FAIL', error: err });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name} ${err ? '- ' + err : ''}`);
  }

  try {
    // 1. Splash Page Load
    await driver.get('https://localhost:5173/');
    await driver.wait(until.elementLocated(By.tagName('body')), 5000);
    addResult('Load Splash Page', true);

    // 2. Role Selection
    await driver.get('https://localhost:5173/role-selection');
    await driver.sleep(1000); // Wait for animation
    const citizenRole = await driver.findElements(By.xpath("//*[contains(text(), 'Citizen') or contains(text(), 'CITIZEN')]"));
    if (citizenRole.length > 0) {
      addResult('Verify Role Selection Page', true);
    } else {
      addResult('Verify Role Selection Page', false, 'Citizen role option not found');
    }
    
    // 3. Login Page Load
    await driver.get('https://localhost:5173/login?role=citizen');
    await driver.wait(until.elementLocated(By.css('input[type="email"]')), 5000);
    addResult('Load Login Page', true);

    // 4. Signup Page Load
    await driver.get('https://localhost:5173/signup');
    await driver.wait(until.elementLocated(By.css('input[type="email"]')), 5000);
    addResult('Load Signup Page', true);

    // 5. Check missing inputs error on Signup
    const nextButton = await driver.findElement(By.xpath("//button[contains(., 'Proceed')]"));
    await nextButton.click();
    await driver.sleep(500);
    const errorMsg = await driver.findElements(By.xpath("//*[contains(text(), 'fill in Name')]"));
    if (errorMsg.length > 0) {
      addResult('Signup Validation (Empty Fields)', true);
    } else {
      addResult('Signup Validation (Empty Fields)', false, 'Validation error not shown');
    }

  } catch (e) {
    console.error("Test execution interrupted:", e);
    addResult('Execution Interrupted', false, e.message);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }

  // Generate Excel Report
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('E2E Test Results');
  ws.columns = [
    { header: 'Test Case', key: 'testCase', width: 35 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Error Details', key: 'error', width: 50 }
  ];
  
  // Style Header
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  });
  
  results.forEach(r => {
    const row = ws.addRow(r);
    if (r.status === 'PASS') {
      row.getCell('status').font = { color: { argb: 'FF008000' }, bold: true };
    } else {
      row.getCell('status').font = { color: { argb: 'FFFF0000' }, bold: true };
    }
  });
  
  const reportPath = 'E2E_Functional_Test_Report.xlsx';
  await wb.xlsx.writeFile(reportPath);
  console.log(`\nAll tests finished. Excel Report saved to: ${reportPath}`);
}

runTests().catch(console.error);
