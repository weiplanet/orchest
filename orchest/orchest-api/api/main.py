from flask import Flask
from flask_cors import CORS

from apis import blueprint as api
from connections import db

app = Flask(__name__)
app.config.from_pyfile('config.py')  # TODO: changed from from_object
app.register_blueprint(api, url_prefix='/api')

# TODO: check whether all browsers support CORS.
CORS(app, resources={r'/*': {'origins': '*'}})


# Initialize the database and create the database file.
db.init_app(app)
with app.app_context():
    db.create_all()


if __name__ == '__main__':
    app.run(host="0.0.0.0")
