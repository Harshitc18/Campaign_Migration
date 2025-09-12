#!/usr/bin/env python3
"""
Campaign Migration Services Launcher
Starts all 5 services on their designated ports:
- Email Converter: 8080
- Push Converter: 8081  
- Campaign Fetcher: 8082
- SMS Converter: 8083
- Content Block Converter: 8084
"""

import subprocess
import sys
import time
import signal
import os
from pathlib import Path

class ServiceLauncher:
    def __init__(self):
        self.processes = []
        self.services = [
            {"name": "Email Converter", "file": "email/email_converter.py", "port": 8080},
            {"name": "Push Converter", "file": "push/push_converter.py", "port": 8081},
            {"name": "Campaign Fetcher", "file": "campaign_fetcher/braze_campaign_fetcher.py", "port": 8082},
            {"name": "SMS Converter", "file": "sms/sms_converter.py", "port": 8083},
            {"name": "Content Block Converter", "file": "Content_block/content_block_fetcher.py", "port": 8084}
        ]
        
    def start_service(self, service):
        """Start a single service"""
        try:
            print(f"🚀 Starting {service['name']} on port {service['port']}...")
            process = subprocess.Popen([
                sys.executable, service['file']
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            self.processes.append({
                'process': process,
                'name': service['name'],
                'port': service['port'],
                'file': service['file']
            })
            
            # Give the service a moment to start
            time.sleep(2)
            
            # Check if process is still running
            if process.poll() is None:
                print(f"✅ {service['name']} started successfully on port {service['port']}")
                return True
            else:
                stdout, stderr = process.communicate()
                print(f"❌ {service['name']} failed to start:")
                if stderr:
                    print(f"   Error: {stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to start {service['name']}: {e}")
            return False
    
    def start_all_services(self):
        """Start all services"""
        print("=" * 60)
        print("🎯 Campaign Migration Services Launcher")
        print("=" * 60)
        
        # Check if we're in the right directory
        if not Path("requirements.txt").exists():
            print("❌ Error: Please run this script from the backend directory")
            sys.exit(1)
        
        success_count = 0
        for service in self.services:
            if Path(service['file']).exists():
                if self.start_service(service):
                    success_count += 1
            else:
                print(f"❌ Service file not found: {service['file']}")
        
        print("\n" + "=" * 60)
        print(f"📊 Summary: {success_count}/{len(self.services)} services started")
        print("=" * 60)
        
        if success_count > 0:
            print("\n🌐 Service URLs:")
            for proc in self.processes:
                if proc['process'].poll() is None:
                    print(f"   • {proc['name']}: http://localhost:{proc['port']}")
                    print(f"     📋 Docs: http://localhost:{proc['port']}/docs")
            
            print(f"\n🛑 Press Ctrl+C to stop all services")
            
            try:
                # Keep the script running and monitor processes
                while True:
                    time.sleep(5)
                    # Check if any process has died
                    for proc in self.processes:
                        if proc['process'].poll() is not None:
                            print(f"⚠️  {proc['name']} has stopped unexpectedly")
                    
            except KeyboardInterrupt:
                print(f"\n🛑 Shutting down all services...")
                self.stop_all_services()
        else:
            print("❌ No services started successfully")
            sys.exit(1)
    
    def stop_all_services(self):
        """Stop all running services"""
        for proc in self.processes:
            if proc['process'].poll() is None:
                print(f"🔴 Stopping {proc['name']}...")
                proc['process'].terminate()
                
                # Wait for graceful shutdown
                try:
                    proc['process'].wait(timeout=5)
                except subprocess.TimeoutExpired:
                    print(f"⚡ Force killing {proc['name']}...")
                    proc['process'].kill()
        
        print("✅ All services stopped")

def main():
    launcher = ServiceLauncher()
    
    # Handle Ctrl+C gracefully
    def signal_handler(sig, frame):
        print(f"\n🛑 Received interrupt signal...")
        launcher.stop_all_services()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    launcher.start_all_services()

if __name__ == "__main__":
    main()
