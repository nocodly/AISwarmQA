export async function GET() {
  return Response.json(
    {
      error: {
        code: "GITHUB_CALLBACK_NOT_ENABLED",
        message: "GitHub callback handling requires a configured GitHub App, signed state validation, and webhook secret verification before production use."
      }
    },
    { status: 501 }
  );
}
