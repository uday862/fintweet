from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import tweepy
from sklearn.preprocessing import RobustScaler
import pickle
from tensorflow.keras.models import load_model
import tensorflow as tf
import joblib
from datetime import datetime, timedelta

# ─────────────── FLASK SETUP ─────────────── #
app = Flask(__name__)
CORS(app)

# ─────────────── LOAD MODEL + SCALERS ─────────────── #
class SliceLastFive(tf.keras.layers.Layer):

    def call(self, x):

        return x[:, -5:, :]
    

model = load_model("stock_predictor.keras", custom_objects={'SliceLastFive': SliceLastFive})

# Load feature scalers
with open("feature_scalers.pkl", "rb") as f:
    feature_scalers = joblib.load(f)

# Load target scaler
with open("y_scaler.pkl", "rb") as f:
    y_scaler = joblib.load(f)

# ─────────────── FINBERT SETUP ─────────────── #
MODEL_NAME = "yiyanghkust/finbert-tone"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
finbert = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
finbert.eval()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
finbert.to(device)

# ─────────────── TWITTER API KEYS ─────────────── #
# (replace with your own keys)
import constants as ct
# auth = tweepy.OAuthHandler(ct.consumer_key, ct.consumer_secret)
# auth.set_access_token(ct.access_token, ct.access_token_secret)
# api = tweepy.API(auth)
# import praw

# reddit = praw.Reddit(
#     client_id=ct.reddit_client_id,
#     client_secret=ct.reddit_client_secret,
#     user_agent=ct.reddit_user_agent
# )


# ─────────────── CONFIG ─────────────── #
SEQUENCE_LENGTH = 20
FEATURE_COLS = [
    "Open", "High", "Low", "Close", "Adj Close", "Volume",
    "fin_pos", "fin_neg", "fin_neu", "tweet_count"
]


# ─────────────── UTILITIES ─────────────── #
def get_finbert_scores(text):
    """Return FinBERT sentiment scores for a given text."""
    inputs = tokenizer(
        text, return_tensors="pt", truncation=True,
        padding=True, max_length=128
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        logits = finbert(**inputs).logits
    probs = torch.softmax(logits, dim=-1).cpu().numpy().squeeze()
    return {"fin_pos": float(probs[0]), "fin_neg": float(probs[1]), "fin_neu": float(probs[2])}


# import requests

# def get_reddit_sentiment(symbol):
#     url = f"https://api.pushshift.io/reddit/search/comment/?q={symbol}&subreddit=stocks&size=100"

#     try:
#         data = requests.get(url, timeout=5).json()
#         comments = data.get("data", [])

#         fin_pos = fin_neg = fin_neu = count = 0

#         for c in comments:
#             text = c.get("body", "")
#             with open("a.txt", "w") as file:
#                 file.write(text)
#             scores = get_finbert_scores(text)

#             fin_pos += scores["fin_pos"]
#             fin_neg += scores["fin_neg"]
#             fin_neu += scores["fin_neu"]
#             count += 1

#         if count == 0:
#             #print("this is returned 0")
#             return 0, 0, 0, 0

#         return fin_pos, fin_neg, fin_neu, count

#     except:
#         print("this is returned 0")
#         return 0, 0, 0, 0
import requests

def get_reddit_sentiment(symbol):
    """Fetch relevant Reddit posts from r/stocks and aggregate FinBERT sentiment."""
    url = f"https://www.reddit.com/r/stocks/search.json?q={symbol}&restrict_sr=1&sort=relevance&limit=100"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"Reddit API status code: {response.status_code}")
            return 0, 0, 0, 0

        data = response.json()
        posts = data.get("data", {}).get("children", [])

        fin_pos = fin_neg = fin_neu = count = 0

        for post in posts:
            post_data = post.get("data", {})
            title = post_data.get("title", "")
            selftext = post_data.get("selftext", "")  # Body text if available
            text = f"{title} {selftext}".strip()  # Combine, strip extras

            if not text:  # Skip empty posts
                continue
            if count < 5:
                try:
                    with open("debug_posts.txt", "a", encoding="utf-8") as file:  # Append mode + UTF-8
                        file.write(f"{symbol} post {count}: {text[:200]}...\n")  # Truncate long texts
                except:
                    pass  # Silent fail if still issues

            scores = get_finbert_scores(text)
            fin_pos += scores["fin_pos"]
            fin_neg += scores["fin_neg"]
            fin_neu += scores["fin_neu"]
            count += 1

        if count == 0:
            print(f"No relevant posts found for {symbol}")
            return 0, 0, 0, 0

        # Average the scores (since we're aggregating)
        return fin_pos / count, fin_neg / count, fin_neu / count, count

    except Exception as e:
        print(f"Error fetching Reddit data for {symbol}: {e}")
        return 0, 0, 0, 0


def get_twitter_sentiment(symbol):
    """Fetch latest tweets and aggregate FinBERT sentiment."""
    tweets = tweepy.Cursor(api.search_tweets, q=symbol, lang="en", tweet_mode="extended").items(100)
    fin_pos, fin_neg, fin_neu, count = 0, 0, 0, 0
    for tweet in tweets:
        text = tweet.full_text
        scores = get_finbert_scores(text)
        fin_pos += scores["fin_pos"]
        fin_neg += scores["fin_neg"]
        fin_neu += scores["fin_neu"]
        count += 1
    if count == 0:
        return 0, 0, 0, 0
    return fin_pos, fin_neg, fin_neu, count



def prepare_data_for_prediction(ticker):
    """Fetch stock + tweets, merge, and build the input window."""
    end = datetime.now()
    start = end - timedelta(days=60)

    # ✅ Download data (flattened)
    #df = yf.download(ticker, start=start, end=end, group_by="ticker")
    df = yf.download(ticker, start=start, end=end, auto_adjust=True)

    # --- flatten columns completely ---
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ['_'.join([str(c) for c in col if c]).strip() for col in df.columns.values]
    else:
        df.columns = [str(c).strip() for c in df.columns]

    # --- Reset index and add Date column ---
    if "Date" not in df.columns:
        df.reset_index(inplace=True)
    else:
        df["Date"] = pd.to_datetime(df["Date"])

    df["Date_only"] = df["Date"].dt.date
    df["Stock Name"] = ticker

    # ✅ Normalize the yfinance column names
    rename_map = {}
    for col in df.columns:
        c = col.lower()
        if "open" in c:
            rename_map[col] = "Open"
        elif "high" in c:
            rename_map[col] = "High"
        elif "low" in c:
            rename_map[col] = "Low"
        elif "close" in c and "adj" not in c:
            rename_map[col] = "Close"
        elif "adj" in c:
            rename_map[col] = "Adj Close"
        elif "volume" in c:
            rename_map[col] = "Volume"

    df.rename(columns=rename_map, inplace=True)

    # ✅ Verify all required columns exist
    missing = [c for c in ["Open", "High", "Low", "Close", "Adj Close", "Volume"] if c not in df.columns]
    for m in missing:
        df[m] = df["Close"] if "Close" in df.columns else 0

    fin_pos, fin_neg, fin_neu, count = get_reddit_sentiment(ticker)    

    # --- get twitter sentiment ---
    sentiments = []
    for date in df["Date_only"].unique():
        # fin_pos, fin_neg, fin_neu, count = get_twitter_sentiment(ticker)
        #fin_pos, fin_neg, fin_neu, count = get_reddit_sentiment(ticker)
        sentiments.append({
            "Date_only": date,
            "fin_pos": fin_pos,
            "fin_neg": fin_neg,
            "fin_neu": fin_neu,
            "tweet_count": count
        })

    sent_df = pd.DataFrame(sentiments)
    df["Date_only"] = pd.to_datetime(df["Date_only"]).dt.date
    sent_df["Date_only"] = pd.to_datetime(sent_df["Date_only"]).dt.date

    merged = pd.merge(df, sent_df, on="Date_only", how="left").fillna(0)

    # --- Take last SEQUENCE_LENGTH days ---
    recent = merged.tail(SEQUENCE_LENGTH).copy()

    # --- Apply feature scalers safely ---
    for col in FEATURE_COLS:
        if col in recent.columns:
            recent[col] = feature_scalers[col].transform(recent[[col]])
        else:
            recent[col] = 0  # fallback if missing

    # --- Reshape for model ---
    X_input = recent[FEATURE_COLS].values.reshape(1, SEQUENCE_LENGTH, len(FEATURE_COLS))
    return X_input





# ─────────────── ROUTES ─────────────── #
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    # Accept JSON or form-encoded requests
    ticker = None
    if request.is_json:
        try:
            body = request.get_json()
            ticker = (body.get('ticker') or body.get('symbol')) if isinstance(body, dict) else None
        except Exception:
            ticker = None

    if not ticker:
        ticker = request.form.get('ticker')

    if not ticker:
        return jsonify({'error': 'Missing ticker in request.'}), 400

    ticker = str(ticker).upper()

    try:
        X_input = prepare_data_for_prediction(ticker)
        pred_scaled = model.predict(X_input)
        pred_raw = y_scaler.inverse_transform(pred_scaled)
        result = round(float(pred_raw[0, 0]), 2)
        return jsonify({
            'ticker': ticker,
            'predicted_close': result,
            'message': f'Predicted next-day closing price for {ticker}: {result}'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─────────────── MAIN ─────────────── #
if __name__ == "__main__":
    import os
    port = int(os.environ.get('MODEL_SERVICE_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
