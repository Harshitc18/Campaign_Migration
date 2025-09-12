#!/usr/bin/env python3
"""
Test script to fetch content blocks from Braze API and log the content
This will help debug if we're correctly capturing the content from Braze
"""

import requests
import json

def test_braze_content_fetch():
    """Test fetching content blocks from Braze API and log the content"""
    
    print("🔍 Testing Braze API Content Fetch")
    print("=" * 50)
    
        # Braze credentials - replace with real values for testing
    braze_credentials = {
        "session_id": "0f2d74df0841d44203f7bc00192766a1",  # Real session ID
        "app_group_id": "68b177e2dafb37006231838e",  # Real app group ID
        "dashboard_number": 9  # Real dashboard number
    }
    
    # Construct Braze API URL
    base_url = f"https://dashboard-{braze_credentials['dashboard_number']:02d}.braze.com"
    braze_api_endpoint = f'{base_url}/engagement/content_blocks'
    
    # Braze API headers
    braze_headers = {
        'Accept': 'application/json',
        'Cookie': f'_session_id={braze_credentials["session_id"]};'
    }
    
    # API parameters
    params = {
        'limit': 10,  # Fetch first 10 content blocks
        'start': 0,
        'app_group_id': braze_credentials['app_group_id']
    }
    
    print(f"🌐 Braze API URL: {braze_api_endpoint}")
    print(f"📋 Parameters: {params}")
    print(f"🔑 Headers: {braze_headers}")
    print()
    
    try:
        print("🚀 Making request to Braze API...")
        response = requests.get(braze_api_endpoint, headers=braze_headers, params=params)
        
        print(f"📡 Response Status: {response.status_code}")
        print(f"📡 Response Headers: {dict(response.headers)}")
        print()
        
        if response.status_code == 200:
            print("✅ Successfully fetched data from Braze!")
            
            data = response.json()
            print(f"📦 Response structure keys: {list(data.keys())}")
            
            # Handle both possible response structures
            content_blocks = data.get('content_blocks', []) or data.get('results', [])
            
            print(f"📊 Found {len(content_blocks)} content blocks")
            print()
            
            if content_blocks:
                for i, block in enumerate(content_blocks, 1):
                    print(f"🔍 Content Block {i}:")
                    print(f"   🆔 ID: {block.get('id', 'N/A')}")
                    print(f"   📝 Name: {block.get('name', 'N/A')}")
                    print(f"   📄 Description: {block.get('description', 'N/A')}")
                    print(f"   🏷️  Content Type: {block.get('content_type', 'N/A')}")
                    
                    # THE IMPORTANT PART - CHECK THE CONTENT
                    content = block.get("content", "")
                    print(f"   📏 Content Length: {len(content)}")
                    print(f"   📝 Content Type: {type(content)}")
                    print(f"   ❓ Content Empty: {not bool(content)}")
                    
                    if content:
                        print("   ✅ CONTENT FOUND!")
                        print("   📄 Content Preview (first 200 chars):")
                        print("   " + "-" * 40)
                        print("   " + content[:200] + ("..." if len(content) > 200 else ""))
                        print("   " + "-" * 40)
                        
                        # Check for HTML tags
                        has_html = '<' in content and '>' in content
                        print(f"   🏷️  Contains HTML: {'Yes' if has_html else 'No'}")
                        
                        # Check for Braze images
                        braze_image_domains = [
                            'braze-images.com',
                            'cdn-staging.braze.com', 
                            'cdn.braze.com',
                            'braze-social-icons.s3.amazonaws.com'
                        ]
                        
                        found_domains = [domain for domain in braze_image_domains if domain in content]
                        if found_domains:
                            print(f"   🖼️  Braze image domains found: {', '.join(found_domains)}")
                        
                        # Check for Liquid variables
                        liquid_patterns = ['{{', '}}', '${']
                        found_liquid = [pattern for pattern in liquid_patterns if pattern in content]
                        if found_liquid:
                            print(f"   🧪 Liquid patterns found: {', '.join(found_liquid)}")
                            
                    else:
                        print("   ❌ NO CONTENT IN THIS BLOCK!")
                        print("   🔍 Let's check all available fields:")
                        for key, value in block.items():
                            if isinstance(value, str) and len(value) > 0:
                                print(f"   📝 {key}: {value[:100]}...")
                            else:
                                print(f"   📝 {key}: {value}")
                        print("   💡 Trying individual content block fetch...")
                        
                        # Try fetching individual content block
                        try:
                            individual_url = f"{base_url}/engagement/content_blocks/{block.get('id')}"
                            individual_response = requests.get(individual_url, headers=braze_headers)
                            if individual_response.status_code == 200:
                                individual_data = individual_response.json()
                                individual_content = individual_data.get('content', '')
                                print(f"   🔍 Individual fetch content length: {len(individual_content)}")
                                if individual_content:
                                    print(f"   ✅ FOUND CONTENT VIA INDIVIDUAL FETCH!")
                                    print(f"   📄 Preview: {individual_content[:100]}...")
                                else:
                                    print(f"   ❌ Still no content in individual fetch")
                            else:
                                print(f"   ❌ Individual fetch failed: {individual_response.status_code}")
                        except Exception as e:
                            print(f"   ❌ Individual fetch error: {str(e)}")
                    
                    print()  # Empty line between blocks
                    
                    # Only show detailed content for first block to avoid too much output
                    if i == 1 and content:
                        print("📄 FULL CONTENT OF FIRST BLOCK:")
                        print("=" * 60)
                        print(content)
                        print("=" * 60)
                        print()
                        
            else:
                print("❌ No content blocks found in response")
                print("📝 Full response:")
                print(json.dumps(data, indent=2))
                
        else:
            print(f"❌ Braze API request failed: {response.status_code}")
            print(f"📝 Response text: {response.text}")
            
            if response.status_code == 401:
                print("🔑 Authentication failed - check session_id")
            elif response.status_code == 403:
                print("🚫 Access forbidden - check app_group_id and permissions")
            elif response.status_code == 404:
                print("🔍 Endpoint not found - check dashboard number and URL")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Request error: {str(e)}")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")

def test_with_backend_api():
    """Test using our backend API that fetches from Braze"""
    
    print("\n🌐 Testing Backend API Braze Fetch")
    print("=" * 50)
    
    # Test with backend endpoint
    try:
        response = requests.get(
            'http://localhost:8084/braze/content-blocks',
            params={
                'session_id': '0f2d74df0841d44203f7bc00192766a1',  # Real session ID
                'app_group_id': '68b177e2dafb37006231838e',  # Real app group ID
                'dashboard_number': 9
            },
            timeout=30
        )
        
        print(f"📡 Backend API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            content_blocks = data.get('content_blocks', [])
            
            print(f"📊 Backend API returned {len(content_blocks)} content blocks")
            
            if content_blocks:
                first_block = content_blocks[0]
                content = first_block.get('content', '')
                
                print(f"📄 First block content length: {len(content)}")
                print(f"📝 Content preview: {content[:100]}..." if content else "❌ No content")
            else:
                print("❌ No content blocks returned from backend")
                
        else:
            print(f"❌ Backend API failed: {response.status_code}")
            print(f"📝 Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Backend API not running")
        print("💡 Start with: cd backend/Content_block && python3 -m uvicorn content_block_fetcher:app --port 8084")
    except Exception as e:
        print(f"❌ Backend API error: {str(e)}")

if __name__ == "__main__":
    print("🔬 Braze Content Block Fetch Test")
    print("=" * 70)
    print()
    print("⚠️  IMPORTANT: Update the credentials in this script with real values:")
    print("   - session_id: Your Braze session ID") 
    print("   - app_group_id: Your Braze app group ID")
    print("   - dashboard_number: Your Braze dashboard number")
    print()
    
    # Test 1: Direct Braze API call
    test_braze_content_fetch()
    
    # Test 2: Through our backend API
    test_with_backend_api()
    
    print()
    print("🎯 Testing completed!")
    print()
    print("💡 If content is empty:")
    print("   1. Check if credentials are correct")
    print("   2. Verify dashboard number")
    print("   3. Check if content blocks have content in Braze dashboard")
