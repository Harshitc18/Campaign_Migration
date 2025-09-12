#!/usr/bin/env python3
"""
Test script to debug the content block migration API
This script will make a direct API call to test the migration endpoint
"""

import requests
import json
import time

# Generate unique names to avoid conflicts
timestamp = int(time.time())

# Test credentials - replace with actual values
TEST_PAYLOAD = {
    "braze_credentials": {
        "session_id": "test_session_id_12345",
        "app_group_id": "test_app_group_id_67890", 
        "dashboard_number": 9
    },
    "moengage_credentials": {
        "app_key": "DNBVW45PTD67QO7I1Q7ORLZD",
        "app_secret": "Z7U18H4XS6OI",
        "api_url": "https://api-01.moengage.com/v1/external/campaigns/content-blocks",
        "created_by_email": "test@example.com",
        "bearer_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE1NzI1MTI0NTciLCJ0eXAiOiJKV1QifQ.eyJhdXRoIjoidjIiLCJkYXRhIjoiVUVYNXZqKzRIUlRDaFp0cGtPck16QmpMdGR1VG1FNEtoUmdIYVRjRG43NjlaMnFlaWlTWlBkT0xnRmVUaE42cS9pRzlRanMrbEo3VkdUSjBXK2pnQi9hc0VTZi9mWnp6THo4dkIwek5mcm5NckNnd2pJZDViTkFhSkFvaXFid3d6SnlVNzJBSnJycTYrUjBRcjFMbExKRUNTMVZOQ1NkWjdPTjJia0d1blA4R2M5RWtkNERvRmNTREtOamtBc3hCc0VpOUZqdTgxbm84ekp6NmdDT0l6dlEwTTVBUVNhYTRtQlRCNTZMSVZmbG1zdjBRNXZ2NktEcVNGT0dKVnJ4aWFqemE1d2sxb2p3b3JHUlNKdGZhK2tkZzVTeC9WMWY2TDBzamRtYnNCaWFySDcrR0hIeUh1OUFDZ2wwSGxHQXZSN3h3b1NoblF4VjJIeElCaVFsUDhvRmZWdU0rRDc2ZmxqOWViOTlSMlZaQ2JQUE8wOS9RdS92YTFjcU5zRGN6NFEyckIyYStUMXdoa0ZBVmNkMXcyRThqcjZWM2MzcW9ua0lHUEpNSis1NUUvcUh6Z0pkK2E1TW5EeWlUblIzejZNc09xZkVmZU9hemJYUkkzWUZoeHJNdWJvQ09NUHJPUDdhSlBNdTBjL0s4dGIvRVlXTEtMejBoMi90S1FSSERrei84M1VBb3Evbkhsd1RyN0dyVDRPK2oza2FieVpWWUdsTmc0UjF3cEg1OTM0U1F5QVpwajF4NGoxNVhNRWQwa1BreUgzYnFLbFlPWHpLaGZ5bFFKSDhydE9FMUxON0pPK3U0VndDWWdCOFlaMkpPSHM5NzFPaFcyZXZPZ3JkYTlGN3pwNStzS0JXWGdyVmcyeFBVaGY4cGNhWStsTXQ4elBzZnh5aExnckE9IiwiZXhwIjoxNzU3NjU0MzgxLCJpYXQiOjE3NTc2NDcxODEsImlzcyI6ImFwcC5tb2VuZ2FnZS5jb20iLCJuYmYiOjE3NTc2NDcxODF9.dqKFB5Ubx1xmIAse5ExwTB05bONFtUgWA_3vi5BiyOcn57243w7Y80UEwY0D_f5wrbYTUi4-bAxbCL2hm2ISd3XJcSLGjOirLK2AB1nqrJ5SwKeT-Yxf9Xg7ci4yZskgcMP-Cs3iGOHWBtlz2Ad-LWBuoAXU_Kxe7Mh7Ed4OxIFgWGtqbwk3_rbl2z4pqlLCmHQ6ySglRQ3tBPwMFS7LtafRRMa9SH8_-sCRc3ETckR1ydtgdZ7FqEej28RoDjdY1IzPAvOAEV7v1hD5lU3PBZwAgc37dYhTUs51IpLeC7zGNsdQkv35297BdDxMC9u6GoBvD6UaswVJaNiN-TJruA",
        "refresh_token": "0b47b20d-c139-4cf5-a124-10f75e9b987c",
        "origin": "https://dashboard-01.moengage.com",
        "data_center": "dashboard-01"
    },
    "content_block": {
        "id": f"test_block_{timestamp}",
        "name": "boss123",  # Unique name to avoid conflicts
        "description": "This is a test content block for debugging with spaces allowed in description",
        "content": """
        <h1>Hello World</h1>
        <p>This is a test content block with some {{custom_attribute.${app_downloaded}}} liquid variables and {{custom_attribute.${favorite_product}}}.</p>
        <div style="text-align: center;">
            <img src="https://braze-images.com/appboy/communication/marketing/content_cards_message_variation_ios.png" alt="Braze Example Image" style="max-width: 100%; height: auto;">
        </div>
        <p>Here's another image from Braze CDN:</p>
        <img src="https://cdn.braze.com/assets/images/sample-marketing-banner.jpg" alt="Marketing Banner" width="300">
        <p>And a social icon from S3:</p>
        <img src="https://braze-social-icons.s3.amazonaws.com/social/facebook-icon.png" alt="Facebook Icon" width="32" height="32">
        """,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
}

def test_migration_api():
    """Test the content block migration API endpoint"""
    
    print("🧪 Testing Content Block Migration API")
    print("=" * 50)
    
    # First test with the corrected name
    test_with_valid_name()
    
    print("\n" + "=" * 50)
    
    # Then test with a problematic name to verify sanitization
    test_with_problematic_name()

def test_with_valid_name():
    """Test with a valid content block name"""
    print("✅ Test 1: Valid Content Block Name")
    print("-" * 40)
    
    # API endpoint
    url = "http://localhost:8084/migrate-content-block"
    
    # Headers
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"📡 Making request to: {url}")
    print(f"📦 Testing with valid name: {TEST_PAYLOAD['content_block']['name']}")
    print()
    
    make_api_request(url, headers, TEST_PAYLOAD)

def test_with_problematic_name():
    """Test with a problematic content block name that needs sanitization"""
    print("🧪 Test 2: Problematic Content Block Name (Should be sanitized)")
    print("-" * 40)
    
    # Create payload with problematic name
    problematic_payload = TEST_PAYLOAD.copy()
    problematic_payload["content_block"] = TEST_PAYLOAD["content_block"].copy()
    problematic_payload["content_block"]["name"] = f"Test Content Block {timestamp} with Spaces & Special Characters! @#$%"
    
    # API endpoint
    url = "http://localhost:8084/migrate-content-block"
    
    # Headers
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"📡 Making request to: {url}")
    print(f"📦 Testing with problematic name: {problematic_payload['content_block']['name']}")
    print(f"💡 Expected: Should be automatically sanitized by backend")
    print()
    
    make_api_request(url, headers, problematic_payload)

def make_api_request(url, headers, payload):
    """Make the actual API request and handle the response"""
    
    try:
        # Make the API request
        print("🚀 Sending request...")
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📊 Response Headers: {dict(response.headers)}")
        print()
        
        if response.status_code == 200:
            print("✅ SUCCESS! Migration completed successfully")
            result = response.json()
            print(f"📝 Response: {json.dumps(result, indent=2)}")
            
        elif response.status_code == 400:
            print("⚠️  BAD REQUEST (400) - Check payload format")
            try:
                error_detail = response.json()
                print(f"📝 Error Details: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"📝 Raw Response: {response.text}")
                
        elif response.status_code == 500:
            print("❌ INTERNAL SERVER ERROR (500) - Backend processing failed")
            try:
                error_detail = response.json()
                print(f"📝 Error Details: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"📝 Raw Response: {response.text}")
                
        else:
            print(f"❓ Unexpected Status Code: {response.status_code}")
            print(f"📝 Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Could not connect to the API")
        print("💡 Make sure the backend service is running on port 8084")
        
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT ERROR: Request took too long")
        print("💡 The API might be processing but taking too long to respond")
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {str(e)}")
        print(f"📝 Error Type: {type(e).__name__}")

def test_health_check():
    """Test the health check endpoint first"""
    print("🏥 Testing Health Check Endpoint")
    print("-" * 30)
    
    try:
        response = requests.get("http://localhost:8084/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed - API is running")
            return True
        else:
            print(f"⚠️  Health check failed - Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed - Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔬 Content Block Migration API Test Suite")
    print("=" * 60)
    print()
    
    # First test health check
    if test_health_check():
        print()
        # Then test the actual migration
        test_migration_api()
    else:
        print("💡 Start the backend service first:")
        print("   cd /Users/harshit.chatterjee/Desktop/Campaign_Migration/backend")
        print("   python3 launch_all.py")
    
    print()
    print("🎯 Test completed!")
