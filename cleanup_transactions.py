"""
Firebase Firestore Cleanup Script
Deletes all transactions from March 2025 to November 2025 from the specified path.

Usage:
1. Install firebase-admin: pip install firebase-admin
2. Download your service account key from Firebase Console:
   - Go to Project Settings > Service Accounts > Generate new private key
   - Save the JSON file as 'serviceAccountKey.json' in the same directory
3. Run: python cleanup_transactions.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Configuration
SERVICE_ACCOUNT_KEY = 'serviceAccountKey.json'  # Update this path if needed
PROJECT_ID = 'accounting-assistant-12f5f'
COLLECTION_PATH = 'artifacts/finance-tracker-production/ledgers/Mick/transactions'

# Date range to delete (March 2025 - November 2025)
START_DATE = '2025-03-01'
END_DATE = '2025-11-30'

def main():
    # Initialize Firebase
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY)
        firebase_admin.initialize_app(cred, {'projectId': PROJECT_ID})
        print(f"✓ Connected to Firebase project: {PROJECT_ID}")
    except FileNotFoundError:
        print(f"✗ Error: {SERVICE_ACCOUNT_KEY} not found.")
        print("  Please download your service account key from Firebase Console:")
        print("  Project Settings > Service Accounts > Generate new private key")
        return
    except Exception as e:
        print(f"✗ Error initializing Firebase: {e}")
        return

    db = firestore.client()
    
    # Parse the collection path
    path_parts = COLLECTION_PATH.split('/')
    collection_ref = db.collection(path_parts[0])
    for i in range(1, len(path_parts)):
        if i % 2 == 1:
            collection_ref = collection_ref.document(path_parts[i])
        else:
            collection_ref = collection_ref.collection(path_parts[i])

    print(f"\nScanning: {COLLECTION_PATH}")
    print(f"Date range: {START_DATE} to {END_DATE}")
    print("-" * 50)

    # Query all documents
    docs = collection_ref.stream()
    
    to_delete = []
    for doc in docs:
        data = doc.to_dict()
        date_str = data.get('date', '')
        
        # Check if date falls within March 2025 - November 2025
        if date_str and START_DATE <= date_str <= END_DATE:
            to_delete.append({
                'id': doc.id,
                'date': date_str,
                'category': data.get('category', 'N/A'),
                'amount': data.get('amount', 'N/A')
            })

    if not to_delete:
        print("No transactions found in the specified date range.")
        return

    print(f"\nFound {len(to_delete)} transactions to delete:\n")
    for item in to_delete[:10]:  # Show first 10
        print(f"  • {item['date']} | {item['category']} | ${item['amount']}")
    if len(to_delete) > 10:
        print(f"  ... and {len(to_delete) - 10} more")

    # Confirm deletion
    print("\n" + "=" * 50)
    confirm = input(f"Delete ALL {len(to_delete)} transactions? (type 'YES' to confirm): ")
    
    if confirm != 'YES':
        print("Aborted. No changes made.")
        return

    # Perform deletion
    print("\nDeleting...")
    deleted_count = 0
    
    for item in to_delete:
        try:
            collection_ref.document(item['id']).delete()
            deleted_count += 1
            if deleted_count % 10 == 0:
                print(f"  Deleted {deleted_count}/{len(to_delete)}...")
        except Exception as e:
            print(f"  ✗ Failed to delete {item['id']}: {e}")

    print(f"\n✓ Successfully deleted {deleted_count} transactions.")
    print("Done!")

if __name__ == '__main__':
    main()
