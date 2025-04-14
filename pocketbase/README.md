# PocketBase Service

This is a standalone PocketBase service for the Meal Planner bot.

## Configuration

The service exposes port 8090 for the PocketBase API and admin interface.

## Deployment on Railway

1. Create a new service in Railway
2. Connect it to your repository and select the `pocketbase` directory
3. The service will automatically use the Dockerfile in this directory
4. No environment variables are required for basic setup

## Internal URL

When deployed on Railway, other services can access this PocketBase instance using the internal URL:
```
https://[service-name].railway.internal:8090
```

Replace `[service-name]` with the actual name of your PocketBase service in Railway. 