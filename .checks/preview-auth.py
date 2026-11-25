"""Authentication regression check through a preview proxy with a different upstream Host."""
import http.client,http.server,threading,subprocess,uuid,os
from playwright.sync_api import sync_playwright,expect
up=subprocess.Popen(['node','.checks/cloud-server.mjs'],stdout=subprocess.PIPE,text=True)
port=int(up.stdout.readline());email='preview-qa-'+uuid.uuid4().hex+'@example.test';pw=uuid.uuid4().hex;name='Preview QA';counts=[]
class Proxy(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args): pass
 def serve(self):
  conn=http.client.HTTPConnection('127.0.0.1',port,timeout=30);headers={k.lower():v for k,v in self.headers.items() if k.lower() not in ('host','accept-encoding','connection')};headers['host']='internal-deployment.example.test';headers['x-forwarded-proto']='https';body=self.rfile.read(int(self.headers.get('Content-Length',0)))
  if self.command in ('POST','PUT'):
   headers.setdefault('origin',base);headers.pop('sec-fetch-site',None)  # Exercise token fallback for proxies that strip browser metadata.
   if not counts:headers.pop('cookie',None)  # Simulate an expired bootstrap cookie on the first submission.
  conn.request(self.command,self.path,body=body,headers=headers);r=conn.getresponse();data=r.read();self.send_response(r.status)
  if self.path=='/api/account' and self.command=='POST':counts.append(r.status)
  for k,v in r.getheaders():
   if k.lower() not in ('connection','transfer-encoding','content-length','server','date'):self.send_header(k,v)
  self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);conn.close()
 do_GET=serve;do_POST=serve;do_PUT=serve
proxy=http.server.ThreadingHTTPServer(('127.0.0.1',0),Proxy);threading.Thread(target=proxy.serve_forever,daemon=True).start();base=f'http://localhost:{proxy.server_port}'
class Parent(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):
  self.send_response(200);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(f'<iframe title="Preview" src="{base}" style="width:95vw;height:92vh"></iframe>'.encode())
parent=http.server.ThreadingHTTPServer(('127.0.0.1',0),Parent);threading.Thread(target=parent.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(args=['--no-sandbox']);ctx=browser.new_context(viewport={'width':1500,'height':1050});page=ctx.new_page();page.set_default_timeout(18000);page.goto(f'http://127.0.0.1:{parent.server_port}');f=page.frame_locator('iframe');f.get_by_label('Account menu').click();f.get_by_role('button',name='Create an account',exact=True).click();d=f.get_by_role('dialog');d.get_by_label('Full name').fill(name);d.get_by_label('Email address').fill(email);d.get_by_label('Password',exact=True).fill(pw)
  # Expire the bootstrap cookie between loading the form and submitting it.
  ctx.clear_cookies(name='__Host-labelin_csrf');d.get_by_role('button',name='Create account',exact=True).click();expect(f.locator('.account-button strong')).to_have_text(name,timeout=20000);expect(f.locator('.local-status')).to_have_text('Synced online',timeout=20000);assert counts.count(403)==1,counts;assert counts.count(200)==1,counts
  page.reload();expect(f.locator('.account-button strong')).to_have_text(name);f.get_by_label('Account menu').click();f.get_by_role('button',name='Sign out',exact=True).click();expect(f.locator('.account-button strong')).to_have_text('Guest',timeout=20000)
  fresh=browser.new_context();g=fresh.new_page();g.goto(base);g.get_by_label('Account menu').click();g.get_by_role('button',name='Sign in',exact=True).click();login=g.get_by_role('dialog');login.get_by_label('Email address').fill(email);login.get_by_label('Password',exact=True).fill(pw);login.get_by_role('button',name='Sign in to workspace',exact=True).click();expect(g.locator('.account-button strong')).to_have_text(name,timeout=18000);expect(g.locator('.local-status')).to_have_text('Synced online',timeout=18000);g.reload();expect(g.locator('.account-button strong')).to_have_text(name)
  print('PASS: registration in an embedded preview with a rewritten Host; expired bootstrap refreshed once; authenticated sync, reload and logout; login in a fresh browser through the proxy.');browser.close()
finally:
 parent.shutdown();proxy.shutdown();up.terminate();up.wait();subprocess.run(['node','--input-type=module','-e',"import fs from 'node:fs';import postgres from 'postgres';const s=postgres(process.env.DATABASE_URL || JSON.parse(fs.readFileSync('server/.database.runtime.json')).url,{max:1});await s`delete from labelin_accounts where email=${process.env.QA_EMAIL}`;await s.end();"],env={**os.environ,'QA_EMAIL':email},check=True)
