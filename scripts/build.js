var LOG=[], lw, net, app, OUT='C:/projects/computer-networks-lab/pkt/', BOOTED={};
var CROSS=[8101], STRAIGHT=[8100], SERIAL=[8106], CONSOLE=[8100,8102,8103,8104,8105,8107];
function log(s){LOG.push(s);}
function add(type,model,name,x,y){
  var n=lw.addDevice(type,model,x,y); var d=net.getDevice(n); d.setName(name); return d;
}
function router(name,x,y,serial,model){
  var d=add(0,model||'2911',name,x,y);
  if(serial){ d.setPower(false); d.addModule('0/1',2,'HWIC-2T'); d.setPower(true); }
  return d;
}
function sw(name,x,y,model){ return add(1,model||'2960-24TT',name,x,y); }
function pc(name,x,y,model){ return add(model=='Laptop-PT'?18:8,model||'PC-PT',name,x,y); }
function srv(name,x,y){ return add(9,'Server-PT',name,x,y); }
function gp(d,n){ var p=d.getPort(n); if(!p && n=='RS 232'){ try{p=d.getRs232Port();}catch(e){} } return p; }
function pn(d,x){
  var i,n,p;
  for(i=0;i<d.getPortCount();i++){ if(d.getPortAt(i).getName()==x) return x; }
  for(i=0;i<d.getPortCount();i++){ p=d.getPortAt(i); n=p.getName(); if(n.indexOf(x)==0 && !p.getLink()) return n; }
  return x;
}
function connect(a,pa,b,pb,types){
  var A=pn(a,pa), B=pn(b,pb), k, t;
  for(k=0;k<types.length;k++){
    t=types[k];
    try{ lw.createLink(a.getName(),A,b.getName(),B,t); }catch(e){}
    if(gp(a,A) && gp(a,A).getLink()){ log('  link '+a.getName()+':'+A+' - '+b.getName()+':'+B+' type '+t); return true; }
  }
  log('  LINKFAIL '+a.getName()+':'+A+' - '+b.getName()+':'+B); return false;
}
function boot(d){
  var nm=d.getName(); if(BOOTED[nm]) return; BOOTED[nm]=1;
  d.skipBoot();
  var cli=d.getCommandLine();
  if(cli.getPrompt().indexOf('initial configuration')>=0){ cli.enterCommand('no'); cli.enterCommand(''); }
}
function cfg(d,lines){
  boot(d); var cli=d.getCommandLine(), i;
  cli.enterCommand('enable'); cli.enterCommand('configure terminal');
  for(i=0;i<lines.length;i++) cli.enterCommand(lines[i]);
  cli.enterCommand('end'); cli.enterCommand('write memory');
}
function ifc(name,ip,mask,extra){
  return ['interface '+name,'ip address '+ip+' '+mask].concat(extra||[]).concat(['no shutdown','exit']);
}
function host(d,ip,mask,gw){
  var p=d.getPort('FastEthernet0'); p.setIpSubnetMask(ip,mask);
  if(gw){ try{p.setDefaultGateway(gw);}catch(e){} try{d.setDefaultGateway(gw);}catch(e2){} }
}
function fresh(){ app.fileNew(false); lw=app.getActiveWorkspace().getLogicalWorkspace(); net=ipc.network(); BOOTED={}; }
function save(file){ app.fileSaveAs(OUT+file+'.pkt'); log('SAVED '+file); }

// ---- topology A (4 PCs, 2 routers, serial) ----
function topoA(pcs,r0,r1){
  fresh();
  var R0=router('Router0',450,250,true), R1=router('Router1',850,250,true);
  var P=[pc('PC0',200,120),pc('PC1',200,380),pc('PC2',1100,120),pc('PC3',1100,380)];
  connect(P[0],'FastEthernet0',R0,'GigabitEthernet0/0',CROSS);
  connect(P[1],'FastEthernet0',R0,'GigabitEthernet0/1',CROSS);
  connect(P[2],'FastEthernet0',R1,'GigabitEthernet0/0',CROSS);
  connect(P[3],'FastEthernet0',R1,'GigabitEthernet0/1',CROSS);
  connect(R0,'Serial0/1/0',R1,'Serial0/1/0',SERIAL);
  var i; for(i=0;i<4;i++) host(P[i],pcs[i][0],pcs[i][1],pcs[i][2]);
  var b0=ifc('GigabitEthernet0/0',r0[0],r0[3]).concat(ifc('GigabitEthernet0/1',r0[1],r0[3]));
  var b1=ifc('GigabitEthernet0/0',r1[0],r1[3]).concat(ifc('GigabitEthernet0/1',r1[1],r1[3]));
  b0=b0.concat(ifc('Serial0/1/0',r0[2],r0[4],['clock rate 64000']));
  b1=b1.concat(ifc('Serial0/1/0',r1[2],r1[4],['clock rate 64000']));
  return {R0:R0,R1:R1,b0:b0,b1:b1};
}
var VL_PC=[['192.168.10.2','255.255.255.224','192.168.10.1'],['192.168.10.34','255.255.255.224','192.168.10.33'],['192.168.10.98','255.255.255.224','192.168.10.97'],['192.168.10.130','255.255.255.224','192.168.10.129']];
var VL_R0=['192.168.10.1','192.168.10.33','192.168.10.65','255.255.255.224','255.255.255.224'];
var VL_R1=['192.168.10.97','192.168.10.129','192.168.10.66','255.255.255.224','255.255.255.224'];
function vlsm(extra0,extra1,file){
  var t=topoA(VL_PC,VL_R0,VL_R1);
  cfg(t.R0,t.b0.concat(extra0)); cfg(t.R1,t.b1.concat(extra1)); save(file);
}
function ppp(enc,file){
  fresh(); var A=router('Router-A',550,250,true), B=router('Router-B',950,250,true);
  var LA=pc('LaptopA',250,250,'Laptop-PT'), LB=pc('LaptopB',1250,250,'Laptop-PT');
  connect(LA,'RS 232',A,'Console',CONSOLE); connect(LB,'RS 232',B,'Console',CONSOLE);
  connect(B,'Serial0/1/0',A,'Serial0/1/0',SERIAL);
  cfg(B,['interface Serial0/1/0','clock rate 250000','encapsulation '+enc,'ip address 192.168.10.5 255.255.255.252','no shutdown','exit']);
  cfg(A,['interface Serial0/1/0','encapsulation '+enc,'ip address 192.168.10.6 255.255.255.252','no shutdown','exit']);
  save(file);
}
function natLab(dynamic,file){
  fresh(); var N=router('NAT-Router',450,250,true), I=router('ISP-Router',800,250,true), S=sw('Switch0',250,250);
  var i, P=[], nat;
  if(dynamic){ for(i=0;i<3;i++){ P[i]=pc('PC'+'ABC'.charAt(i),100,100+i*150); host(P[i],'172.31.1.'+(10+i),'255.255.255.0','172.31.1.1'); connect(P[i],'FastEthernet0',S,'FastEthernet0/',STRAIGHT); }
    var V=srv('Server0',1050,250); connect(I,'GigabitEthernet0/0',V,'FastEthernet0',CROSS); host(V,'8.8.8.2','255.255.255.248','8.8.8.1');
    nat=['access-list 1 permit 172.31.1.0 0.0.0.255','ip nat pool LAN 200.100.100.1 200.100.100.2 netmask 255.255.255.0','ip nat inside source list 1 pool LAN'];
  } else {
    var PA=pc('PCA',100,120), SV=srv('Server0',100,380), PO=pc('PC-Outside',1050,250);
    connect(PA,'FastEthernet0',S,'FastEthernet0/',STRAIGHT); connect(SV,'FastEthernet0',S,'FastEthernet0/',STRAIGHT); connect(I,'GigabitEthernet0/0',PO,'FastEthernet0',CROSS);
    host(PA,'172.31.1.10','255.255.255.0','172.31.1.1'); host(SV,'172.31.1.2','255.255.255.0','172.31.1.1'); host(PO,'8.8.8.2','255.255.255.248','8.8.8.1');
    nat=['ip nat inside source static 172.31.1.2 200.100.100.2'];
  }
  connect(S,'FastEthernet0/',N,'GigabitEthernet0/0',STRAIGHT); connect(N,'Serial0/1/0',I,'Serial0/1/0',SERIAL);
  cfg(N,ifc('GigabitEthernet0/0','172.31.1.1','255.255.255.0',['ip nat inside']).concat(ifc('Serial0/1/0','200.200.200.1','255.255.255.252',['clock rate 64000','ip nat outside'])).concat(['ip route 0.0.0.0 0.0.0.0 200.200.200.2']).concat(nat));
  cfg(I,ifc('GigabitEthernet0/0','8.8.8.1','255.255.255.248').concat(ifc('Serial0/1/0','200.200.200.2','255.255.255.252')).concat(['ip route 200.100.100.0 255.255.255.0 200.200.200.1']));
  save(file);
}

var LABS=[
 function(){ fresh(); var a=pc('PC0',250,250), b=pc('PC1',550,250); connect(a,'FastEthernet0',b,'FastEthernet0',CROSS);
   host(a,'192.168.1.1','255.255.255.0'); host(b,'192.168.1.2','255.255.255.0'); save('01_intro_p2p'); },
 function(){ fresh(); var i,k,p,q;
   var s=sw('Star-Switch',200,150,'2950-24'); for(i=0;i<4;i++){ p=pc('Star-PC'+i,80+i*90,40+((i%2)*220)); connect(p,'FastEthernet0',s,'FastEthernet0/',STRAIGHT); }
   var bs=[],bp=[]; for(i=0;i<4;i++){ bs[i]=sw('Bus-Switch'+i,500+i*130,150,'2950-24'); bp[i]=pc('Bus-PC'+i,500+i*130,50); connect(bp[i],'FastEthernet0',bs[i],'FastEthernet0/',STRAIGHT); if(i) connect(bs[i-1],'FastEthernet0/',bs[i],'FastEthernet0/',CROSS); }
   var rs=[],rp=[],rx=[[100,400],[300,400],[300,550],[100,550]]; for(i=0;i<4;i++){ rs[i]=sw('Ring-Switch'+i,rx[i][0],rx[i][1],'2950-24'); rp[i]=pc('Ring-PC'+i,rx[i][0]-60,rx[i][1]+(i<2?-60:60)); connect(rp[i],'FastEthernet0',rs[i],'FastEthernet0/',STRAIGHT); }
   for(i=0;i<4;i++) connect(rs[i],'FastEthernet0/',rs[(i+1)%4],'FastEthernet0/',CROSS);
   var ms=[],mp=[],mx=[[600,400],[800,400],[800,550],[600,550]]; for(i=0;i<4;i++){ ms[i]=sw('Mesh-Switch'+i,mx[i][0],mx[i][1],'2950-24'); mp[i]=pc('Mesh-PC'+i,mx[i][0]+(i%2?60:-60),mx[i][1]+(i<2?-60:60)); connect(mp[i],'FastEthernet0',ms[i],'FastEthernet0/',STRAIGHT); }
   for(i=0;i<4;i++) for(k=i+1;k<4;k++) connect(ms[i],'FastEthernet0/',ms[k],'FastEthernet0/',CROSS);
   var h=add(4,'Hub-PT','Hub0',1000,250); for(i=0;i<3;i++){ q=pc('Hub-PC'+i,950+i*80,150+(i%2)*200); connect(q,'FastEthernet0',h,'FastEthernet',STRAIGHT); }
   save('02_network_topologies'); },
 function(){ fresh(); var p=pc('PC0',250,250), r=router('Router0',550,250,false,'1941');
   connect(p,'RS 232',r,'Console',CONSOLE);
   cfg(r,['line console 0','password cisco','login','exit','enable password cisco123']); save('03_router_console'); },
 function(){ vlsm([],[],'04_ip_addressing_vlsm'); },
 function(){ vlsm(['ip route 192.168.10.96 255.255.255.224 192.168.10.66','ip route 192.168.10.128 255.255.255.224 192.168.10.66'],
                  ['ip route 192.168.10.0 255.255.255.224 192.168.10.65','ip route 192.168.10.32 255.255.255.224 192.168.10.65'],'05a_static_routing'); },
 function(){ vlsm(['ip route 0.0.0.0 0.0.0.0 192.168.10.66'],['ip route 0.0.0.0 0.0.0.0 192.168.10.65'],'05b_default_routing'); },
 function(){ natLab(false,'06a_static_nat'); },
 function(){ natLab(true,'06b_dynamic_nat'); },
 function(){
   var pcs=[['192.168.10.2','255.255.255.0','192.168.10.1'],['192.168.11.2','255.255.255.0','192.168.11.1'],['192.168.12.2','255.255.255.0','192.168.12.1'],['192.168.13.2','255.255.255.0','192.168.13.1']];
   var t=topoA(pcs,['192.168.10.1','192.168.11.1','10.0.0.1','255.255.255.0','255.0.0.0'],['192.168.12.1','192.168.13.1','10.0.0.2','255.255.255.0','255.0.0.0']);
   cfg(t.R0,t.b0.concat(['router rip','network 192.168.10.0','network 192.168.11.0','network 10.0.0.0']));
   cfg(t.R1,t.b1.concat(['router rip','network 192.168.12.0','network 192.168.13.0','network 10.0.0.0'])); save('07_rip_v1'); },
 function(){ vlsm(['router rip','version 2','network 192.168.10.0','network 192.168.10.32','network 192.168.10.64','no auto-summary'],
                  ['router rip','version 2','network 192.168.10.64','network 192.168.10.96','network 192.168.10.128','no auto-summary'],'08_rip_v2'); },
 function(){
   fresh(); var R=[router('R1',500,100),router('R2',250,400),router('R3',750,400)];
   connect(R[0],'GigabitEthernet0/0',R[1],'GigabitEthernet0/0',CROSS); connect(R[0],'GigabitEthernet0/1',R[2],'GigabitEthernet0/0',CROSS); connect(R[1],'GigabitEthernet0/1',R[2],'GigabitEthernet0/1',CROSS);
   cfg(R[0],ifc('GigabitEthernet0/0','192.168.12.1','255.255.255.0').concat(ifc('GigabitEthernet0/1','192.168.13.1','255.255.255.0')).concat(['router ospf 1','network 192.168.12.0 0.0.0.255 area 0','network 192.168.13.0 0.0.0.255 area 0']));
   cfg(R[1],ifc('GigabitEthernet0/0','192.168.12.2','255.255.255.0').concat(ifc('GigabitEthernet0/1','192.168.23.2','255.255.255.0')).concat(['router ospf 1','network 192.168.12.0 0.0.0.255 area 0','network 192.168.23.0 0.0.0.255 area 0']));
   cfg(R[2],ifc('GigabitEthernet0/0','192.168.13.3','255.255.255.0').concat(ifc('GigabitEthernet0/1','192.168.23.3','255.255.255.0')).concat(['router ospf 1','network 192.168.13.0 0.0.0.255 area 0','network 192.168.23.0 0.0.0.255 area 0']));
   save('09_ospf_single_area'); },
 function(){
   fresh(); var R=[router('R1',250,100),router('R2',650,100),router('R3',250,400),router('R4',650,400)];
   connect(R[0],'GigabitEthernet0/0',R[1],'GigabitEthernet0/0',CROSS); connect(R[0],'GigabitEthernet0/1',R[2],'GigabitEthernet0/0',CROSS); connect(R[1],'GigabitEthernet0/1',R[3],'GigabitEthernet0/0',CROSS);
   cfg(R[0],ifc('GigabitEthernet0/0','192.168.12.1','255.255.255.0').concat(ifc('GigabitEthernet0/1','192.168.13.1','255.255.255.0')).concat(['router ospf 1','network 192.168.12.0 0.0.0.255 area 0','network 192.168.13.0 0.0.0.255 area 1']));
   cfg(R[1],ifc('GigabitEthernet0/0','192.168.12.2','255.255.255.0').concat(ifc('GigabitEthernet0/1','192.168.24.2','255.255.255.0')).concat(['router ospf 1','network 192.168.12.0 0.0.0.255 area 0','network 192.168.24.0 0.0.0.255 area 2']));
   cfg(R[2],ifc('GigabitEthernet0/0','192.168.13.3','255.255.255.0').concat(ifc('Loopback0','3.3.3.3','255.255.255.255')).concat(['router ospf 1','network 192.168.13.0 0.0.0.255 area 1','network 3.3.3.3 0.0.0.0 area 1']));
   cfg(R[3],ifc('GigabitEthernet0/0','192.168.24.4','255.255.255.0').concat(ifc('Loopback0','4.4.4.4','255.255.255.255')).concat(['router ospf 1','network 192.168.24.0 0.0.0.255 area 2','network 4.4.4.4 0.0.0.0 area 2']));
   save('10_ospf_multi_area'); },
 function(){ ppp('ppp','11_ppp'); },
 function(){ ppp('hdlc','12_hdlc'); },
 function(){
   fresh(); var A=router('R1',300,250), B=router('R2',700,250); connect(A,'GigabitEthernet0/0',B,'GigabitEthernet0/0',CROSS);
   cfg(A,ifc('GigabitEthernet0/0','11.0.0.1','255.255.255.0').concat(ifc('Loopback0','1.1.1.1','255.255.255.0')).concat(['router bgp 1','neighbor 11.0.0.2 remote-as 2','network 1.1.1.0 mask 255.255.255.0']));
   cfg(B,ifc('GigabitEthernet0/0','11.0.0.2','255.255.255.0').concat(ifc('Loopback0','2.2.2.2','255.255.255.0')).concat(['router bgp 2','neighbor 11.0.0.1 remote-as 1']));
   save('13_bgp'); },
 function(){
   fresh(); var X=[[350,150],[850,150],[350,450],[850,450]], R=[], P=[], i;
   for(i=0;i<4;i++){ R[i]=router('Router'+i,X[i][0],X[i][1]); P[i]=pc('PC'+i,X[i][0]+(i%2?250:-250),X[i][1]); connect(P[i],'FastEthernet0',R[i],'GigabitEthernet0/0',CROSS); host(P[i],'192.168.'+(i+1)+'.1','255.255.255.0','192.168.'+(i+1)+'.2'); }
   connect(R[0],'GigabitEthernet0/1',R[1],'GigabitEthernet0/1',CROSS); connect(R[0],'GigabitEthernet0/2',R[2],'GigabitEthernet0/2',CROSS);
   connect(R[1],'GigabitEthernet0/2',R[3],'GigabitEthernet0/2',CROSS); connect(R[2],'GigabitEthernet0/1',R[3],'GigabitEthernet0/1',CROSS);
   var A=[['192.168.1.2','10.0.0.1','20.0.0.1'],['192.168.2.2','10.0.0.2','30.0.0.1'],['192.168.3.2','40.0.0.1','20.0.0.2'],['192.168.4.2','40.0.0.2','30.0.0.2']];
   var N=[['192.168.1.0','10.0.0.0','20.0.0.0'],['192.168.2.0','10.0.0.0','30.0.0.0'],['192.168.3.0','20.0.0.0','40.0.0.0'],['192.168.4.0','30.0.0.0','40.0.0.0']];
   for(i=0;i<4;i++){
     cfg(R[i],ifc('GigabitEthernet0/0',A[i][0],'255.255.255.0').concat(ifc('GigabitEthernet0/1',A[i][1],'255.255.255.0')).concat(ifc('GigabitEthernet0/2',A[i][2],'255.255.255.0')).concat(['router eigrp 100','network '+N[i][0],'network '+N[i][1],'network '+N[i][2],'no auto-summary']));
   }
   save('14_eigrp'); },
 function(){
   fresh(); var L=pc('ADMIN',250,250,'Laptop-PT'), S=sw('Switch',600,250); connect(L,'FastEthernet0',S,'FastEthernet0/1',CROSS);
   host(L,'10.0.0.10','255.0.0.0');
   cfg(S,['enable password admin','interface vlan 1','ip address 10.0.0.20 255.0.0.0','no shutdown','exit','line vty 0 15','password cisco','login']);
   save('15a_telnet_switch'); },
 function(){
   fresh(); var L=pc('ADMIN',250,250,'Laptop-PT'), R=router('Router',600,250); connect(L,'FastEthernet0',R,'GigabitEthernet0/0',CROSS);
   host(L,'10.0.0.10','255.0.0.0','10.0.0.1');
   cfg(R,['enable password admin'].concat(ifc('GigabitEthernet0/0','10.0.0.1','255.0.0.0')).concat(['line vty 0 15','password cisco','login']));
   save('15b_telnet_router'); }
];
function run(fm, base){
  app=ipc.appWindow(); var i, only='';
  try{ only=fm.getFileContents(base+'only.txt')||''; }catch(e){}
  only=only.replace(/\s/g,'');
  for(i=0;i<LABS.length;i++){
    if(only.length && (','+only+',').indexOf(','+(i+1)+',')<0) continue;
    log('LAB '+(i+1));
    try{ LABS[i](); }catch(e){ log('  ERR lab '+(i+1)+': '+e); }
    fm.writePlainTextToFile(base+'build_log.txt', LOG.join('\n'));
  }
  log('DONE'); fm.writePlainTextToFile(base+'build_log.txt', LOG.join('\n'));
}
