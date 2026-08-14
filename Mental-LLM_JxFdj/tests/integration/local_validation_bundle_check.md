# Local Validation Bundle Check

This check bundles the local-only validation path into one command.

## Command

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check_all_local_validations.ps1
```

Expected final result: `ALL_LOCAL_VALIDATIONS_PASS`

## Included Checks

1. `npm run typecheck`
2. `npm run smoke`
3. `scripts/check_local_audit_gateway.ps1`
4. `scripts/check_forward_workflow_gateway.ps1`
5. `scripts/check_upstream_model_permission_error.ps1`

## Acceptance Notes

- This bundle verifies the complete local-only validation package.
- It does not require real NK-GeniOS credentials or real workflow-gateway access.
- It does not prove Feishu table visibility.
