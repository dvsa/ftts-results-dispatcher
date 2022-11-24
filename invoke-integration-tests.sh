MASTER_KEY=$(az functionapp keys list -n $1 -g $2 --query masterKey -o tsv)

export FUNCTION_MASTER_KEY=${MASTER_KEY}

npm run test:int