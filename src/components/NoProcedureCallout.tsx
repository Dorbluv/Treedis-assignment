/** Says why there is no plan. Inspection steps only ever come from an approved procedure. */
export function NoProcedureCallout({
  assetId,
  hasAlert,
  escalated,
}: {
  assetId: string;
  hasAlert: boolean;
  escalated: boolean;
}) {
  return (
    <div className="gap" role="status">
      <p><strong>No approved procedure for {assetId}.</strong></p>
      {hasAlert && (
        <p>We will not create inspection steps without one. {escalated ? 'Sent to site review.' : 'Send it to site review.'}</p>
      )}
    </div>
  );
}
