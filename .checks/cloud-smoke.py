import subprocess,time,uuid,os,re
from playwright.sync_api import sync_playwright,expect
server=subprocess.Popen(['node','.checks/cloud-server.mjs'],stdout=subprocess.PIPE,text=True);port=server.stdout.readline().strip();base='http://127.0.0.1:'+port
email='qa-'+uuid.uuid4().hex+'@example.test';pwd='Device Sync Test 38!';name='Online QA'
try:
 with sync_playwright() as p:
  b=p.chromium.launch(args=['--no-sandbox']);c1=b.new_context();c2=b.new_context();c3=b.new_context();p1=c1.new_page();p2=c2.new_page();p3=c3.new_page()
  for page in [p1,p2,p3]:
   page.set_default_timeout(16000);page.goto(base);page.get_by_role('button',name='English (EN)').click()
  def auth(page,mode,password):
   page.get_by_label('Account menu').click();page.get_by_role('button',name='Create an account' if mode=='register' else 'Sign in',exact=True).click();d=page.get_by_role('dialog');
   if mode=='register': d.get_by_label('Full name').fill(name)
   d.get_by_label('Email address').fill(email.upper());d.get_by_label('Password',exact=True).fill(password);d.get_by_role('button',name='Create account' if mode=='register' else 'Sign in to workspace',exact=True).click()
  auth(p1,'register',pwd);expect(p1.locator('.account-button strong')).to_have_text(name,timeout=15000);expect(p1.locator('.local-status')).to_have_text('Synced online',timeout=18000)
  p1.get_by_role('button',name='Add address',exact=True).click();d=p1.get_by_role('dialog');d.locator('#addr-name').fill('QA Recipient');d.locator('#addr-phone').fill('081234567890');d.get_by_label('Street address').fill('Jl. Test 1');d.get_by_label('Province').select_option('Jawa Barat');d.locator('#addr-city').fill('Bandung');d.locator('#addr-postal').fill('40123');d.get_by_role('button',name='Save address').click();expect(p1.locator('.local-status')).to_have_text('Synced online',timeout=18000)
  auth(p2,'login',pwd);expect(p2.locator('.address-row')).to_contain_text('QA Recipient',timeout=20000);expect(p2.locator('.account-button strong')).to_have_text(name);print('PASS: registration and login in independent browsers restore remote data.',flush=True)
  p2.get_by_role('button',name='4 × 8 in',exact=True).click();expect(p2.locator('.local-status')).to_have_text('Synced online',timeout=18000);p1.evaluate("window.dispatchEvent(new Event('focus'))");expect(p1.get_by_role('combobox',name='Paper template')).to_have_value('4x8',timeout=18000)
  p1.get_by_role('button',name='Create new label',exact=True).click();p1.get_by_label('Choose from address book').select_option(index=1);p1.locator('#recipient-name').fill('Cross-device draft');p1.get_by_title('Back to dashboard').click();expect(p1.locator('.local-status')).to_have_text('Synced online',timeout=18000);p2.evaluate("window.dispatchEvent(new Event('focus'))");expect(p2.get_by_role('button',name='Resume draft')).to_be_visible(timeout=18000);p2.get_by_role('button',name='Resume draft').click();expect(p2.locator('#recipient-name')).to_have_value('Cross-device draft');p2.get_by_title('Back to dashboard').click();print('PASS: paper settings and drafts sync across devices.',flush=True)
  auth(p3,'login','wrong credential');expect(p3.get_by_role('alert')).to_contain_text('Incorrect email',timeout=16000);assert c3.request.get(base+'/api/workspace').status==401
  ident=p1.evaluate('JSON.parse(localStorage.getItem("labelin:session")).cloudId');assert c1.request.get(base+'/api/workspace',headers={'X-Labelin-Account':str(uuid.uuid4())}).status==409
  h={'X-Labelin-Account':ident};remote=c1.request.get(base+'/api/workspace',headers=h).json();assert remote['document']['workspace']['addresses'][0]['name']=='QA Recipient';assert c1.request.put(base+'/api/workspace',headers=h,data={'revision':0,'document':remote['document']}).status==409
  p1.get_by_label('Account menu').click();p1.get_by_role('button',name='Sign out',exact=True).click();expect(p1.locator('.account-button strong')).to_have_text('Guest',timeout=16000);assert c1.request.get(base+'/api/workspace',headers=h).status==401;assert c2.request.get(base+'/api/workspace',headers=h).status==200;print('PASS: invalid credentials rejected, account isolation, revision checks and device-specific logout.',flush=True);b.close()
finally:
 server.terminate();server.wait();subprocess.run(['node','--input-type=module','-e',"import fs from 'node:fs';import postgres from 'postgres';const s=postgres(JSON.parse(fs.readFileSync('server/.database.runtime.json')).url,{max:1});await s`delete from labelin_accounts where email=${process.env.QA_EMAIL}`;await s.end();"],env={**os.environ,'QA_EMAIL':email},check=True)
