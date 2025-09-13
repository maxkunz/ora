import json
import os
import requests
from requests.auth import HTTPBasicAuth
from semantic_interpreter import SemanticInterpreter
from context_resolver import ContextResolver

# Get the environment variables for client ID, client secret, etc.
GENESYS_CLIENT_ID = os.getenv('GENESYS_CLIENT_ID')
GENESYS_CLIENT_SECRET = os.getenv('GENESYS_CLIENT_SECRET')
GENESYS_ENVIRONMENT = "mypurecloud.de"  # Adjust based on region

# Function to retrieve an OAuth access token using Client Credentials Grant
def get_access_token():
    url = f"https://login.{GENESYS_ENVIRONMENT}/oauth/token"
    auth = HTTPBasicAuth(GENESYS_CLIENT_ID, GENESYS_CLIENT_SECRET)
    payload = {
        'grant_type': 'client_credentials'
    }
    response = requests.post(url, auth=auth, data=payload)
    
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        raise Exception(f"Failed to retrieve access token: {response.text}")

# Function to fetch data from a Genesys Cloud Data Table
def fetch_datatable_row(access_token, datatable_id, row_key):
    url = f"https://api.{GENESYS_ENVIRONMENT}/api/v2/flows/datatables/{datatable_id}/rows/{row_key}?showbrief=false"
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        # Fetch the row data
        datatable_data = response.json()
        print(f"Feteched Data: {datatable_data}")
        # Parse the stringified JSON attributes into proper objects
        if 'categories' in datatable_data:
            datatable_data['categories'] = json.loads(datatable_data['categories'])
        if 'concerns' in datatable_data:
            datatable_data['concerns'] = json.loads(datatable_data['concerns'])
        if 'targets' in datatable_data:
            datatable_data['targets'] = json.loads(datatable_data['targets'])
        if 'matrix' in datatable_data:
            datatable_data['matrix'] = json.loads(datatable_data['matrix'])

        return datatable_data
    else:
        raise Exception(f"Failed to fetch datatable row: {response.text}")

# Lambda function handler
import json

def lambda_handler(event, context):
    print("start lambda")
    try:

        # Parse the request body
        request_data = json.loads(event['body'])
        datatable_id = request_data.get('datatableId')
        row_key = request_data.get('rowKey')
        text = request_data.get('text')
        conversation_history = request_data.get('conversationHistory')
        domain_config_raw = request_data.get('domain')

        if isinstance(conversation_history, str):
            conversation_history = json.loads(conversation_history)

        # All other keys in the request_data will be considered as parameters
        parameters = {
            key: value for key, value in request_data.items()
            if key not in ['datatableId', 'rowKey', 'domain']
        }

        # Determine source of config
        if domain_config_raw:
            if isinstance(domain_config_raw, str):
                datatable_data = json.loads(domain_config_raw)
            else:
                datatable_data = domain_config_raw
            print("Using domain config from request")
        else:
            # Fetch the row from the datatable (this will act as the config)
            # Authenticate and get access token
            access_token = get_access_token() 
            datatable_data = fetch_datatable_row(access_token, datatable_id, row_key)
            print(f"Fetched config from datatable: {datatable_id}, row: {row_key}")

        # Initialize the SemanticInterpreter with the config
        resolver = ContextResolver(config=datatable_data)

        # Interpret the input sentence using the resolver
        if conversation_history:
            result = resolver.resolve_with_conversation(text, conversation_history)
        else:
            result = resolver.resolve(text)

        print(f"Result: {result}")
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
