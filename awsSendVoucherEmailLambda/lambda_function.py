import json
import boto3

def lambda_handler(event, context):
    # Parse input event
    try:
        if isinstance(event, dict) and "body" in event:
            body = json.loads(event["body"])  # API Gateway event (string body)
        else:
            body = event  # Direct invocation event (dict body)
    except (KeyError, ValueError, TypeError):
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid input format"})
        }

    recipient_email = body.get("email")
    voucher_count = body.get("voucher_count")

    # Validate input
    if not recipient_email or not isinstance(voucher_count, int) or voucher_count <= 0:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid email or voucher count"})
        }

    # AWS SES Client
    ses_client = boto3.client("ses")

    # Public S3 Voucher Image URL
    voucher_image_url = "https://fallsafe.s3.ap-southeast-1.amazonaws.com/misc/voucher.jpg"

    # Email content with requested format
    subject = "Your NTUC Voucher"
    body_html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Voucher Email</title>
        <style>
            body {{ font-family: Arial, sans-serif; }}
            .container {{ padding: 20px; max-width: 600px; margin: auto; background-color: #f7f7f7; border-radius: 10px; }}
            h1 {{ color: #003399; }}
            .voucher {{ font-size: 18px; font-weight: bold; color: #003399; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Congratulations!</h1>
            <p>Dear User,</p>
            <p>You have received <span class="voucher">{voucher_count} NTUC $10 voucher(s)</span>.</p>
            <p>Please find your voucher below:</p>
            <img src="{voucher_image_url}" alt="Voucher Image" style="max-width:100%; height:auto;">
            <p>Best regards,</p>
            <p>The FallSafe Team</p>
        </div>
    </body>
    </html>
    """

    # Construct email message
    message = {
        "Subject": {"Data": subject},
        "Body": {
            "Html": {"Data": body_html}
        }
    }

    # Send email via SES with FallSafe as the sender name
    try:
        response = ses_client.send_email(
            Source="FallSafe <jeffreyleeprg2@gmail.com>",
            Destination={"ToAddresses": [recipient_email]},
            Message=message
        )
        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Voucher email sent successfully"})
        }
    except ses_client.exceptions.MessageRejected as e:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Email sending failed: {str(e)}"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": f"Unexpected error: {str(e)}"})
        }
