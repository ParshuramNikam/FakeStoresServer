import User from "../../model/User.model.js";
import bcrypt from 'bcrypt';
import generateToken from "../../helpers/generateToken.js";
import envVars from 'dotenv';
envVars.config();

String.prototype.trimRight = function(){
	return this.replace(/\s+$/,'');
}

const login = async (req, res, next) => {
	try {
		console.log("req.body:- ",req.body);
		let { password, secretKey } = req.body;
		password = password.trimRight();
		let email = req.body.email.toLowerCase().trim();
 
		if (!email || !password) return res.status(400).send({ status: "failed", message: "Email and Password is Required!" });

		const user = await User.findOne({ email });
		// console.log(user);
		if (!user) return res.status(200).send({ message: "User Not Exits" });

		// -------------- ADD This to route for verified user  required! ---------------
		if(!user.verified) return res.status(400).send({status:"failed", message: "Please verify your credientials by Link sent on your emailID!"})
		// -------------- xxxxxxxxxxxxxxxxxxxxxxx ---------------

		if ( (user.role === 2 || user.role===0) && secretKey !== process.env.SECRET_KEY) {
			return res.status(200).send({ message: "You don't have a permision to use these credentials!" });
		}

		const isValidPassword = bcrypt.compareSync(password, user.password);
		console.log(isValidPassword);
		if (!isValidPassword) return res.status(400).send({ status:"failed" ,message: 'Invalid Credientials' });

		// create a signed Token for the user. 
		const signedToken = await generateToken(user.userId, user.role);
		
		// save token in cookies 
		// await res.cookie("access_token", signedToken, {
			// expire duration:- 1 month = 31days * 24 hours * 1hour
			// expires: new Date(Date.now() + 31*24*3600000) // 3600000 millisec = 1 hour -> cookie will be removed after 1 months
			// secure: true, // use in production
		// });

		// check device already having any token -> if yes then delete it from DB:
		const alreadyHavingToken = req.cookies['access_token'];
		console.log(alreadyHavingToken);
		if(alreadyHavingToken) await User.findOneAndUpdate({email},{$pull: {token: alreadyHavingToken}});

		await User.findOneAndUpdate({email}, {$push: {token: signedToken}})
		
		// const updatedUser = await User.findOne({email});
		// .populate('cart').select('-_id -password -token -role -otp -verified -createdAt -updatedAt -__v')

		console.log("**********************************");
		// console.log(updatedUser);
		console.log("**********************************");

		res.locals.user = {
			userId: user.userId,
			email: user.email,
			apiKey: user.apiKey,
			cart: user.cart,
			accessToken: signedToken,
		};
		next();
	} catch (error) {
		console.log(error);
		res.status(400).send({
			status: "Failed",
			message: error.message,
			error,
		});
	}
}

export default login