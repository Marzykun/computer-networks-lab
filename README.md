# Computer Networks Lab (21CSC302J) – Packet Tracer, per the SRM lab manual

Topologies and addresses below are taken from "Lab manual final.pdf". Exp numbers follow your diary (15 exps).
`pkt/` holds ready-to-open Packet Tracer files, one per experiment (open the .pkt and it is already wired and configured).
Deviations from the manual: all routers are 2911s with an HWIC-2T, so serial is Se0/1/0 (PPP/HDLC also Se0/1/0, EIGRP uses Gi0/0-0/2 instead of Fa0/0,Fa4/0,Fa5/0). `scripts/` holds the generator (build.js).

Router naming: Router0/Router1. Serial = Se0/1/0 (add HWIC-2T: power off, drag HWIC-2T in, power on). DCE end gets `clock rate 64000`.
Paste each block in the router's CLI (`enable` first). Always finish with `end` + `write memory`.

## Exp 1 – Intro / Exp 2 – P2P and topologies
Exp 1: PC–PC with crossover; ping. Exp 2: build bus, star, ring, mesh, hybrid with 2950-24 switches / hub and PCs. No config.

## Exp 3 – Router config through console
Devices: 1 PC, 1941 router, console cable (PC RS232 → router Console). PC Desktop > Terminal.
```
enable
configure terminal
line console 0
password cisco
login
exit
enable password cisco123
exit
copy run start
```

## Topology A (Exp 4B, 5, 7b): 4 PCs (copper cross-over to routers), 2 routers, serial DCE
| Device | Iface | IP | Mask | Gateway |
|---|---|---|---|---|
| PC0 | Fa0 | 192.168.10.2 | 255.255.255.224 | 192.168.10.1 |
| PC1 | Fa0 | 192.168.10.34 | 255.255.255.224 | 192.168.10.33 |
| PC2 | Fa0 | 192.168.10.98 | 255.255.255.224 | 192.168.10.97 |
| PC3 | Fa0 | 192.168.10.130 | 255.255.255.224 | 192.168.10.129 |
| Router0 | Gi0/0 / Gi0/1 / Se0/1/0 | .1 / .33 / .65 | /27 | – |
| Router1 | Gi0/0 / Gi0/1 / Se0/1/0 | .97 / .129 / .66 | /27 | – |
(all 192.168.10.x). PC0,PC1 on Router0 Gi0/0, Gi0/1; PC2,PC3 on Router1 Gi0/0, Gi0/1.

## Exp 4 – IP addressing and subnetting (VLSM)
```
! Router0
configure terminal
interface g0/0
ip address 192.168.10.1 255.255.255.224
no shutdown
interface g0/1
ip address 192.168.10.33 255.255.255.224
no shutdown
interface s0/1/0
ip address 192.168.10.65 255.255.255.224
clock rate 64000
no shutdown
end
! Router1
configure terminal
interface g0/0
ip address 192.168.10.97 255.255.255.224
no shutdown
interface g0/1
ip address 192.168.10.129 255.255.255.224
no shutdown
interface s0/1/0
ip address 192.168.10.66 255.255.255.224
no shutdown
end
```

## Exp 5 – Static and default routing (Topology A)
Static:
```
! Router0
ip route 192.168.10.96 255.255.255.224 192.168.10.66
ip route 192.168.10.128 255.255.255.224 192.168.10.66
! Router1
ip route 192.168.10.0 255.255.255.224 192.168.10.65
ip route 192.168.10.32 255.255.255.224 192.168.10.65
```
Default (remove static first):
```
! Router0
ip route 0.0.0.0 0.0.0.0 192.168.10.66
! Router1
ip route 0.0.0.0 0.0.0.0 192.168.10.65
```
Check: PC0 `ping 192.168.10.130`, `tracert 192.168.10.130`; `show ip route`.

## Exp 6 – NAT
Static NAT topology: PC – 2960 switch – NAT/ISP 1941 routers (Gi0/0 inside, Se0/0/0 outside) – Server (private 172.31.1.2, public 200.100.100.2).
```
ip nat inside source static 172.31.1.2 200.100.100.2
interface s0/0/0
ip nat outside
interface g0/0
ip nat inside
```
Dynamic NAT (PCA/PCB/PCC on 172.31.1.0/24, link 200.200.200.0/30, server 8.8.8.2):
```
access-list 1 permit 172.31.1.0 0.0.0.255
ip nat pool LAN 200.100.100.1 200.100.100.2 netmask 255.255.255.0
ip nat inside source list 1 pool LAN
interface s0/0/0
ip nat outside
interface g0/0
ip nat inside
```
Check: `show ip nat translations`.

## Exp 7 – RIP v1 (own topology: same shape as A, /24 networks)
| Device | IP | Mask | GW |
|---|---|---|---|
| PC0 / PC1 / PC2 / PC3 | 192.168.10.2 / 11.2 / 12.2 / 13.2 | 255.255.255.0 | .10.1 / .11.1 / .12.1 / .13.1 |
| Router0 | Gi0/0 192.168.10.1, Gi0/1 192.168.11.1, Se0/1/0 10.0.0.1 | /24, /24, 255.0.0.0 | – |
| Router1 | Gi0/0 192.168.12.1, Gi0/1 192.168.13.1, Se0/1/0 10.0.0.2 | /24, /24, 255.0.0.0 | – |
```
! Router0
router rip
network 192.168.10.0
network 192.168.11.0
network 10.0.0.0
! Router1
router rip
network 192.168.12.0
network 192.168.13.0
network 10.0.0.0
```

## Exp 8 – RIP v2 (Topology A addressing)
```
! Router0
router rip
version 2
network 192.168.10.0
network 192.168.10.32
network 192.168.10.64
no auto-summary
! Router1
router rip
version 2
network 192.168.10.64
network 192.168.10.96
network 192.168.10.128
no auto-summary
```

## Exp 9 – Single-area OSPF (3 routers, all area 0)
Links: R1–R2 192.168.12.0/24 (.1/.2), R1–R3 192.168.13.0/24 (.1/.3), R2–R3 192.168.23.0/24 (.2/.3). Fast/GigE interfaces, no PCs.
```
! R1
router ospf 1
network 192.168.12.0 0.0.0.255 area 0
network 192.168.13.0 0.0.0.255 area 0
! R2
router ospf 1
network 192.168.12.0 0.0.0.255 area 0
network 192.168.23.0 0.0.0.255 area 0
! R3
router ospf 1
network 192.168.13.0 0.0.0.255 area 0
network 192.168.23.0 0.0.0.255 area 0
```
Verify: `show ip ospf neighbor`, `show ip protocols`, `show ip route ospf`. Optional: R2 `interface loopback 0` / `ip address 2.2.2.2 255.255.255.0`; R3 `router-id 3.3.3.3` + `clear ip ospf process`.

## Exp 10 – Multi-area OSPF (4 routers)
R1–R2 192.168.12.0/24 area 0 (.1/.2), R1–R3 192.168.13.0/24 area 1 (.1/.3), R2–R4 192.168.24.0/24 area 2 (.2/.4). R3 Lo0 3.3.3.3/32, R4 Lo0 4.4.4.4/32.
```
! R1
router ospf 1
network 192.168.12.0 0.0.0.255 area 0
network 192.168.13.0 0.0.0.255 area 1
! R2
router ospf 1
network 192.168.12.0 0.0.0.255 area 0
network 192.168.24.0 0.0.0.255 area 2
! R3
router ospf 1
network 192.168.13.0 0.0.0.255 area 1
network 3.3.3.3 0.0.0.0 area 1
! R4
router ospf 1
network 192.168.24.0 0.0.0.255 area 2
network 4.4.4.4 0.0.0.0 area 2
```
Verify: `show ip route ospf` (O IA), `ping 4.4.4.4 source 3.3.3.3` on R3.

## Exp 11 – PPP / Exp 12 – HDLC (2 routers, laptops, DCE link 192.168.10.4/30)
Router-B is DCE (`clock rate 250000`) with .5, Router-A .6. Laptops connect via console for CLI (or use the router CLI tab).
```
! Router-B
interface serial 0/0/0
clock rate 250000
encapsulation ppp        ! Exp 12: encapsulation hdlc
ip address 192.168.10.5 255.255.255.252
no shutdown
! Router-A
interface serial 0/0/0
encapsulation ppp        ! Exp 12: encapsulation hdlc
ip address 192.168.10.6 255.255.255.252
no shutdown
```
Check: `show interfaces serial 0/0/0`, `ping 192.168.10.5`.

## Exp 13 – BGP (R1 AS 1, R2 AS 2, link 11.0.0.0/24)
```
! R1
interface fastethernet0/0
ip address 11.0.0.1 255.255.255.0
no shutdown
interface loopback 0
ip address 1.1.1.1 255.255.255.0
router bgp 1
neighbor 11.0.0.2 remote-as 2
network 1.1.1.0 mask 255.255.255.0
! R2
interface fastethernet0/0
ip address 11.0.0.2 255.255.255.0
no shutdown
interface loopback 0
ip address 2.2.2.2 255.255.255.0
router bgp 2
neighbor 11.0.0.1 remote-as 1
```
Check: `show ip bgp summary`, `show ip bgp`.

## Exp 14 – EIGRP (4 routers in a ring + 4 PCs, AS 100)
PCn: 192.168.n.1 /24, GW 192.168.n.2 (n = 1..4). Router0 Fa0/0 192.168.1.2, Fa4/0 10.0.0.1, Fa5/0 20.0.0.1; Router1 Fa0/0 192.168.2.2, Fa4/0 10.0.0.2, Fa5/0 30.0.0.1; Router2 Fa0/0 192.168.3.2, Fa4/0 40.0.0.1, Fa5/0 20.0.0.2; Router3 Fa0/0 192.168.4.2, Fa4/0 40.0.0.2, Fa5/0 30.0.0.2 (all /24 style masks 255.255.255.0). Use routers with FastEthernet 4/0 and 5/0 (e.g. add NM-2FE2W).
```
! Router0
router eigrp 100
network 192.168.1.0
network 10.0.0.0
network 20.0.0.0
no auto-summary
! Router1: 192.168.2.0, 10.0.0.0, 30.0.0.0
! Router2: 192.168.3.0, 20.0.0.0, 40.0.0.0
! Router3: 192.168.4.0, 30.0.0.0, 40.0.0.0
```
Check: `show ip eigrp neighbors`, `show ip eigrp topology`.

## Exp 15 – Telnet
Switch: ADMIN laptop 10.0.0.10/8 – Switch Fa0/1.
```
enable
configure terminal
enable password admin
interface vlan 1
ip address 10.0.0.20 255.0.0.0
no shutdown
exit
line vty 0 15
password cisco
login
```
Test from ADMIN command prompt: `telnet 10.0.0.20`, password `cisco`, then `enable` / `admin`.
Router: ADMIN 10.0.0.10/8 GW 10.0.0.1 – Router Fa0/0 10.0.0.1/8.
```
enable
configure terminal
enable password admin
interface fa0/0
ip address 10.0.0.1 255.0.0.0
no shutdown
line vty 0 15
password cisco
login
```
Test: `telnet 10.0.0.1`.
