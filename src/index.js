const express = require("express")
const morgan = require ("morgan")
const bodyParser = require ("body-parser")
const Recaptcha = require("express-recaptcha").RecaptchaV2
const formData = require("form-data")
const Mailgun = require("mailgun.js")
const mailgun = new Mailgun(formData)
const {check, validationResult} = require ("express-validator")
const {isLength} = require("validator");

const validation = [
    check("name", "A valid name is required.").not().isEmpty().trim().escape(),
    check("email","Please use a valid email").isEmail(),
    check("subject").optional().trim().escape(),
    check("message","A message of 2000 characters or less is required").trim().escape().isLength({min:1,max:2000})
]

const app = express()
const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY,process.env.RECAPTCHA_SECRET_KEY)
const mg = mailgun.client({username: 'api', key:process.env.MAILGUN_API_KEY})

app.use(morgan("dev"))
app.use(express.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

const indexRoute = express.Router()

const handleGetRequest = (request, response) => {
    return response.json("The express server is live")
}

const handlePostRequest = (request, response) => {
    response.append('Content-Type', 'text/html')

if (request.recaptcha.error) {
    return response.send(
        `<div class='alert alert-danger' role='alert'><strong>Oh Snap!</strong>There was a recaptcha error. Please try again</div>`
    )
}

const errors = validationResult(request)

    if(errors.isEmpty() === false){
        const currentError = errors.array()[0]
        return response.send(`<div class='alert alert-danger' role='alert'><strong>Oh Snap!</strong>${currentError}</div>`)
    }

const {email,subject,name,message} = request.body

const mailgunData = {
		to: process.env.MAIL_RECIPIENT,
		from: `${name} <postmaster@${process.env.MAILGUN_DOMAIN}>`,
		subject: `${email}: ${subject}`,
		text: message
	}

	mg.messages.create(process.env.MAILGUN_DOMAIN, mailgunData)
		.then(msg =>
		response.send(
			`<div class='alert alert-success' role='alert' >${JSON.stringify(msg)}</div>`
    ))
    .catch(err =>
            response.send(
                `<div class='alert alert-danger' role='alert'><strong>Oh Snap!</strong>${err}</div>`
            ))

    }

    indexRoute.route("/")
        .get(handleGetRequest)
        .post(recaptcha.middleware.verify, validation, handlePostRequest)

    app.use('/apis', indexRoute)

    app.listen(4200, () => {
        console.log('Express Successfully Built')
    })