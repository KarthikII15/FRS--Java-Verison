#!/usr/bin/env python3
"""
prama_discover.py — Discover and configure Prama India (Hikvision) cameras on LAN.

Usage:
    python3 prama_discover.py                   # Scan default subnet 192.168.1.0/24
    python3 prama_discover.py --subnet 10.0.0.0/24
    python3 prama_discover.py --ip 192.168.1.101 --user admin --pass PASSWORD

What it does:
  1. WS-Discovery broadcast to find ONVIF devices on the LAN
  2. HTTP probe on port 80 /ISAPI/System/deviceInfo to confirm it's Hikvision/Prama
  3. Print full cameras.json config ready to paste into /opt/frs-models/config/cameras.json
  4. Test RTSP main + sub stream connectivity
  5. Optionally take a test snapshot via ISAPI

Dependencies:
    pip install onvif-zeep httpx --break-system-packages
"""

import argparse
import ipaddress
import json
import logging
import socket
import sys
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Prama / Hikvision URL builders (same as runner.py)
# ─────────────────────────────────────────────────────────────────────────────

def rtsp_main(ip, user, passwd, channel=1, port=554):
    return f"rtsp://{user}:{passwd}@{ip}:{port}/Streaming/Channels/{channel}01"

def rtsp_sub(ip, user, passwd, channel=1, port=554):
    return f"rtsp://{user}:{passwd}@{ip}:{port}/Streaming/Channels/{channel}02"

def snapshot_url(ip, user, passwd, channel=1, http_port=80):
    return f"http://{user}:{passwd}@{ip}:{http_port}/ISAPI/Streaming/channels/{channel}01/picture"

def device_info_url(ip, http_port=80):
    return f"http://{ip}:{http_port}/ISAPI/System/deviceInfo"

def onvif_url(ip, http_port=80):
    return f"http://{ip}:{http_port}/onvif/device_service"


# ─────────────────────────────────────────────────────────────────────────────
# Device probe
# ─────────────────────────────────────────────────────────────────────────────

def probe_device(ip: str, username: str, password: str,
                 http_port: int = 80, rtsp_port: int = 554,
                 timeout: int = 4) -> Optional[dict]:
    """
    Probe an IP address to check if it's a Prama/Hikvision camera.
    Returns device info dict or None.
    """
    url = device_info_url(ip, http_port)
    try:
        resp = httpx.get(url, auth=(username, password), timeout=timeout)
        if resp.status_code != 200:
            return None

        text = resp.text
        # Hikvision ISAPI returns XML — check for Prama or Hikvision markers
        if not any(k in text for k in ["Hikvision", "PRAMA", "deviceName", "serialNumber"]):
            return None

        # Parse key fields from XML (basic string extraction — no xml lib needed)
        def extract(tag):
            start = text.find(f"<{tag}>")
            end   = text.find(f"</{tag}>")
            if start == -1 or end == -1:
                return "unknown"
            return text[start + len(tag) + 2 : end].strip()

        return {
            "ip":           ip,
            "deviceName":   extract("deviceName"),
            "model":        extract("model"),
            "serialNumber": extract("serialNumber"),
            "firmwareVersion": extract("firmwareVersion"),
            "macAddress":   extract("macAddress"),
            "http_port":    http_port,
            "rtsp_port":    rtsp_port,
        }

    except Exception:
        return None


def test_rtsp(url: str, timeout_sec: int = 5) -> bool:
    """Test if an RTSP URL is reachable using a quick socket probe on port 554."""
    import urllib.parse
    try:
        parsed = urllib.parse.urlparse(url)
        host = parsed.hostname
        port = parsed.port or 554
        with socket.create_connection((host, port), timeout=timeout_sec):
            return True
    except Exception:
        return False


def take_snapshot(ip: str, username: str, password: str,
                  channel: int = 1, http_port: int = 80,
                  save_path: str = "./prama_test_snapshot.jpg") -> bool:
    """Fetch a snapshot via ISAPI and save to disk."""
    url = snapshot_url(ip, username, password, channel, http_port)
    try:
        resp = httpx.get(url, auth=(username, password), timeout=10)
        resp.raise_for_status()
        with open(save_path, "wb") as f:
            f.write(resp.content)
        print(f"  ✅ Snapshot saved to {save_path} ({len(resp.content)} bytes)")
        return True
    except Exception as e:
        print(f"  ❌ Snapshot failed: {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# WS-Discovery (lightweight — no external lib needed)
# ─────────────────────────────────────────────────────────────────────────────

WS_DISCOVERY_MSG = b"""<?xml version="1.0" encoding="utf-8"?>
<Envelope xmlns:dn="http://www.onvif.org/ver10/network/wsdl"
          xmlns="http://www.w3.org/2003/05/soap-envelope">
  <Header>
    <wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      uuid:discover-prama
    </wsa:MessageID>
    <wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      urn:schemas-xmlsoap-org:ws:2005:04:discovery
    </wsa:To>
    <wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">
      http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe
    </wsa:Action>
  </Header>
  <Body>
    <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <Types>dn:NetworkVideoTransmitter</Types>
    </Probe>
  </Body>
</Envelope>"""

def ws_discover(timeout_sec: int = 3) -> list[str]:
    """
    Send WS-Discovery multicast probe and collect responding IPs.
    Prama/Hikvision cameras respond to this on 239.255.255.250:3702.
    """
    found = []
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.settimeout(timeout_sec)
        sock.sendto(WS_DISCOVERY_MSG, ("239.255.255.250", 3702))

        deadline = time.time() + timeout_sec
        while time.time() < deadline:
            try:
                data, addr = sock.recvfrom(4096)
                ip = addr[0]
                if ip not in found:
                    found.append(ip)
                    print(f"  📡 WS-Discovery response from {ip}")
            except socket.timeout:
                break
        sock.close()
    except Exception as e:
        print(f"  WS-Discovery error: {e}")
    return found


# ─────────────────────────────────────────────────────────────────────────────
# Subnet scan
# ─────────────────────────────────────────────────────────────────────────────

def scan_subnet(subnet: str, username: str, password: str,
                http_port: int = 80, rtsp_port: int = 554) -> list[dict]:
    """Scan a subnet for Prama/Hikvision cameras (TCP port 554 open first)."""
    network = ipaddress.IPv4Network(subnet, strict=False)
    found   = []

    print(f"\n🔍 Scanning {subnet} for Prama cameras (port {rtsp_port})...")
    print("   (This may take 30–60 seconds for a /24 subnet)\n")

    for ip_obj in network.hosts():
        ip = str(ip_obj)
        # Quick TCP check on RTSP port
        try:
            with socket.create_connection((ip, rtsp_port), timeout=0.3):
                pass
        except Exception:
            continue

        print(f"  🔌 Port {rtsp_port} open on {ip} — probing ISAPI...")
        info = probe_device(ip, username, password, http_port, rtsp_port)
        if info:
            found.append(info)
            print(f"  ✅ Prama/Hikvision camera: {info['model']} @ {ip}")

    return found


# ─────────────────────────────────────────────────────────────────────────────
# cameras.json generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_cameras_json(devices: list[dict], username: str, password: str) -> dict:
    """Generate the cameras.json config for runner.py from discovered devices."""
    cameras = []
    for i, dev in enumerate(devices, start=1):
        ip       = dev["ip"]
        rtsp_p   = dev["rtsp_port"]
        http_p   = dev["http_port"]
        cam_id   = f"prama-{ip.replace('.', '-')}"

        cameras.append({
            "id":          cam_id,
            "name":        dev.get("deviceName", f"Prama Camera {i}"),
            "model":       dev.get("model", "unknown"),
            "serial":      dev.get("serialNumber", ""),
            "ipAddress":   ip,
            "username":    username,
            "password":    password,
            "channel":     1,
            # Use sub-stream for live attendance (lower res = faster decode)
            "rtspUrl":     rtsp_sub(ip, username, password, 1, rtsp_p),
            # Keep main stream URL for snapshot/enrollment
            "rtspMainUrl": rtsp_main(ip, username, password, 1, rtsp_p),
            "snapshotUrl": snapshot_url(ip, username, password, 1, http_p),
            "onvifUrl":    onvif_url(ip, http_p),
            "fpsTarget":   5,
            "resolution":  "1280x720",
            "streamType":  "sub",
            "role":        "entry",
            "enabled":     True,
        })

    return {
        "brand":    "prama_hikvision",
        "rtsp_port": 554,
        "onvif_port": 80,
        "cameras":  cameras,
    }


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main():
    logging.basicConfig(level=logging.WARNING)

    parser = argparse.ArgumentParser(
        description="Discover and configure Prama India (Hikvision) cameras"
    )
    parser.add_argument("--subnet",   default="192.168.1.0/24",
                        help="Subnet to scan (default: 192.168.1.0/24)")
    parser.add_argument("--ip",       help="Single camera IP (skip subnet scan)")
    parser.add_argument("--user",     default="admin",  help="Camera username (default: admin)")
    parser.add_argument("--pass",     dest="password",  default="",
                        help="Camera password")
    parser.add_argument("--http-port", type=int, default=80)
    parser.add_argument("--rtsp-port", type=int, default=554)
    parser.add_argument("--snapshot", action="store_true",
                        help="Take a test snapshot from each found camera")
    parser.add_argument("--out",      default="cameras.json",
                        help="Output cameras.json path (default: cameras.json)")
    args = parser.parse_args()

    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║   Prama India (Hikvision) Camera Discovery Tool     ║")
    print("╚══════════════════════════════════════════════════════════════╝\n")

    devices = []

    if args.ip:
        # Single camera mode
        print(f"🔍 Probing single camera at {args.ip}...")
        info = probe_device(args.ip, args.user, args.password,
                            args.http_port, args.rtsp_port)
        if info:
            devices.append(info)
            print(f"  ✅ Found: {info['model']} (S/N: {info['serialNumber']})")
        else:
            print(f"  ❌ No Prama/Hikvision camera found at {args.ip}")
            print("     Check: IP address, username/password, and that HTTP port 80 is accessible")
            sys.exit(1)
    else:
        # WS-Discovery first (fast)
        print("📡 Running WS-Discovery broadcast (3 seconds)...")
        disc_ips = ws_discover(timeout_sec=3)
        for ip in disc_ips:
            info = probe_device(ip, args.user, args.password, args.http_port, args.rtsp_port)
            if info:
                devices.append(info)

        # Then subnet scan for cameras that don't respond to WS-Discovery
        subnet_found = scan_subnet(args.subnet, args.user, args.password,
                                   args.http_port, args.rtsp_port)
        existing_ips = {d["ip"] for d in devices}
        for d in subnet_found:
            if d["ip"] not in existing_ips:
                devices.append(d)

    if not devices:
        print("\n❌ No Prama/Hikvision cameras found.")
        print("   Tips:")
        print("   • Make sure cameras are powered and on the same LAN")
        print("   • Default Prama/Hikvision credentials: admin / (set on first boot)")
        print("   • Run SADP tool on Windows to find camera IPs first")
        sys.exit(1)

    print(f"\n✅ Found {len(devices)} camera(s):\n")

    # Test RTSP connectivity for each
    for dev in devices:
        ip = dev["ip"]
        main_url = rtsp_main(ip, args.user, args.password, 1, args.rtsp_port)
        sub_url  = rtsp_sub (ip, args.user, args.password, 1, args.rtsp_port)

        main_ok = test_rtsp(main_url)
        sub_ok  = test_rtsp(sub_url)

        print(f"  📷 {dev.get('model', 'Unknown')} @ {ip}")
        print(f"     Firmware:    {dev.get('firmwareVersion', '?')}")
        print(f"     Serial:      {dev.get('serialNumber', '?')}")
        print(f"     MAC:         {dev.get('macAddress', '?')}")
        print(f"     Main stream: {'✅' if main_ok else '❌'} {main_url.replace(args.password, '****')}")
        print(f"     Sub-stream:  {'✅' if sub_ok else '❌'} {sub_url.replace(args.password, '****')}")

        if args.snapshot:
            snap_path = f"./snapshot_{ip.replace('.', '_')}.jpg"
            print(f"     Snapshot:    ", end="")
            take_snapshot(ip, args.user, args.password, 1, args.http_port, snap_path)
        print()

    # Generate cameras.json
    config = generate_cameras_json(devices, args.user, args.password)
    with open(args.out, "w") as f:
        json.dump(config, f, indent=2)

    print(f"📄 cameras.json written to: {args.out}")
    print(f"\nNext steps:")
    print(f"  1. Review {args.out} and set correct roles (entry/exit)")
    print(f"  2. Copy to Jetson: scp {args.out} ubuntu@JETSON_IP:/opt/frs-models/config/cameras.json")
    print(f"  3. Start runner:   sudo systemctl start frs-edge")
    print(f"\nTo test a stream on your PC:")
    for dev in devices:
        url = rtsp_sub(dev['ip'], args.user, args.password, 1, args.rtsp_port)
        print(f"  vlc '{url.replace(args.password, '****')}'")


if __name__ == "__main__":
    main()
