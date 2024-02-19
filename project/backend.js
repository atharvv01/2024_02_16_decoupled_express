const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

// mongo imports
const Model = require("./schema.js");

function handleMongoBackend(app) {
    app.use(bodyParser.json());
    /*
*---------------------------------------- PRODUCT DATABASE APIS ------------------------------------*
*/

    /*
    ^ This is used for first API wherein you can search product details using its name
    */
    app.get("/search", async (req, res) => {
        try {
            // Extract searchParam from query parameters
            const searchParam = req.query.searchParam;

            // Check if searchParam is missing
            if (!searchParam) {
                return res
                    .status(400)
                    .json({ error: "Missing searchParam in the request body" });
            }

            // Use Mongoose to search for the product in the MongoDB collection
            const product = await Model.ProductModel.findOne({
                productName: { $regex: new RegExp(searchParam, "i") }, // Case-insensitive search
            });

            // Respond based on whether the product is found
            if (product) {
                res.json(product);
            } else {
                res.status(404).json({ error: "Product not found" });
            }
        } catch (error) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    /*
    ^ This is used for eigth API wherein you can search product details using its id
    */
    app.get("/search_id", async (req, res) => {
        // Extract id from query parameters
        let id = req.query.id;

        try {
            // Find the product in MongoDB
            const product = await Model.ProductModel.findOne({ productId: id });

            // Respond based on whether the product is found
            if (product) {
                res.json(product);
            } else {
                res.status(404).json({ error: "Product not found" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    /*
    ^ This is used for second API wherein you need to update product database
    */
    app.put("/checkout", async (req, res) => {
        // Extract id and quantity from query parameters
        const checkoutid = req.query.id;
        const checkoutquantity = req.query.quantity;

        // Check if id or quantity is missing
        if (!checkoutid || !checkoutquantity) {
            return res.status(400).json({
                error: "Missing id or quantity in the request query parameters",
            });
        }

        try {
            // Find the product in MongoDB
            const product = await Model.ProductModel.findOne({ productId: checkoutid });

            // Respond based on whether the product is found
            if (product) {
                // Update the stock of the product
                product.stock -= parseInt(checkoutquantity, 10);
                await product.save();

                // Create a new order object
                const newOrder = new Model.orderModel({
                    O_ID: uuidv4(),
                    O_Address: "Sample Address", // Add the actual address details
                    O_P_ID: checkoutid,
                    O_status: "Pending", // Set the initial status
                    O_totalcost: checkoutquantity * product.price,
                    order_quantity: checkoutquantity,
                });

                // Save the new order to MongoDB
                await newOrder.save();

                // Respond with success and updated data
                res.json({
                    success: "Stock and order updated successfully",
                    updatedProduct: product,
                    newOrder,
                });
            } else {
                res.status(404).json({ error: "Product not found" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    /*
    *------------------------------------ ADD , UPDATE AND DELETE PRODUCTS FROM DATABASE-------------------------------------*
    */

    /*
    ^ This is used for fourth API wherein you need to add product to database
    */
    app.post("/product", async (req, res) => {
        // Extract new product details from the request body
        const newProduct = req.body;
        console.log(newProduct);

        // Check if required fields are missing
        if (
            !newProduct ||
            !newProduct.productId ||
            !newProduct.productName ||
            !newProduct.price ||
            !newProduct.stock ||
            !newProduct.imageUrl
        ) {
            return res.status(400).json({ error: "Invalid request body" });
        }

        try {
            // Check if a product with the same productId already exists in MongoDB
            const existingProduct = await Model.ProductModel.findOne({
                productId: newProduct.productId,
            });

            // Respond based on whether the product with the same productId already exists
            if (existingProduct) {
                return res
                    .status(400)
                    .json({ error: "Product with the same productId already exists" });
            }

            // Create a new Product instance using the Mongoose model
            const productInstance = new Model.ProductModel(newProduct);

            // Save the new product to MongoDB
            await productInstance.save();

            // Respond with success and new product details
            res.json({ success: "Product added successfully", newProduct });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    /* 
    ^ This is used for fifth API wherein you need to update product to database
    */
    app.put("/product", async (req, res) => {
        // Extract id and quantity from query parameters
        const checkoutid = req.query.id;
        const checkoutquantity = req.query.quantity;

        // Check if id or quantity is missing
        if (!checkoutid || !checkoutquantity) {
            return res.status(400).json({
                error: "Missing id or quantity in the request query parameters",
            });
        }

        try {
            // Find the product in MongoDB
            const product = await Model.ProductModel.findOne({ productId: checkoutid });

            // Respond based on whether the product is found
            if (product) {
                // Update the stock of the product
                product.stock = parseInt(checkoutquantity, 10);
                await product.save();

                // Respond with success and updated product details
                res.json({
                    success: "Stock updated successfully",
                    updatedProduct: product,
                });
            } else {
                res.status(404).json({ error: "Product not found" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    /*
    ^ This is used for sixth API wherein you need to delete product to database
    */
    app.delete("/product", async (req, res) => {
        // Extract id from query parameters
        const toDelete = parseInt(req.query.id, 10);

        // Check if id is invalid
        if (isNaN(toDelete)) {
            return res.status(400).json({ error: "Invalid id parameter" });
        }

        try {
            // Find the product in MongoDB
            const product = await Model.ProductModel.findOneAndDelete({
                productId: toDelete,
            });

            // Respond based on whether the product is found
            if (product) {
                // Respond with success
                res.json({ success: "Product deleted successfully" });
            } else {
                res.status(404).json({ error: "Product not found" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    /*
    *----------------------------------------------- ORDER DATABASE APIS ----------------------------------------------------*
    */

    /*
    ^ This is used for seventh API wherein you get add attributes order using Id
    */
    app.post("/order", async (req, res) => {
        // Extract id and address from query parameters
        let checkoutid = req.query.id;
        let address = req.query.address;

        // Find the order in MongoDB
        try {
            const order = await Model.orderModel.findOne({
                O_P_ID: parseInt(checkoutid, 10),
            });

            // Respond based on whether the order is found
            if (order) {
                // Update order details
                order.O_Address = address;
                order.O_status = "pending";

                // Save the updated order to MongoDB
                await order.save();

                // Respond with success and updated order details
                res.json({
                    success: "Order updated successfully",
                    updatedOrder: order,
                });
            } else {
                res.status(404).json({ error: "Order not found" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    /*
    ^ This is used for seventh API wherein you get status of order using Id
    */
    app.get("/status", async (req, res) => {
        // Extract orderid from query parameters
        let orderid = req.query.orderid;

        try {
            // Find the order in MongoDB
            const order = await Model.orderModel.findOne({ O_ID: orderid });

            // Respond based on whether the order is found
            if (order) {
                res.json(order.O_status);
            } else {
                res.status(404).json({ error: "Order not found" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

    /*
    ^ This is used for ninth API wherein you can cancel order
    */
    app.delete("/cancel", async (req, res) => {
        // Extract cancelid from query parameters
        const toDelete = req.query.cancelid;

        try {
            // Find the order in MongoDB
            const order = await Model.orderModel.findOne({ O_ID: toDelete });

            // Respond based on whether the order is found
            if (order) {
                // Retrieve the order quantity and the corresponding product ID
                const updatedQuant = order.order_quantity;
                const pid = order.O_P_ID;

                // Find the product in MongoDB
                const product = await Model.ProductModel.findOne({ productId: pid });

                // Respond based on whether the product is found
                if (product) {
                    // Update the stock of the product with the given productId
                    product.stock += parseInt(updatedQuant, 10);

                    // Save the updated product to MongoDB
                    await product.save();

                    // Remove the order from the Order collection
                    await Model.orderModel.deleteOne({ O_ID: toDelete });

                    // Respond with success
                    res.json({ success: "Order canceled successfully" });
                } else {
                    res.status(404).json({ error: "Product not found" });
                }
            } else {
                res.status(404).json({ error: "Order not found" });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });

}

function handleJsonBackend(app) {
    app.use(bodyParser.json());
    // Read products data from the external JSON file
    const productsData = JSON.parse(fs.readFileSync("./db_files/products.json", "utf8"));
    const orderData = JSON.parse(fs.readFileSync("./db_files/orders.json", "utf8"));

    /*
    *---------------------------------------------- PRODUCT DATABASE APIS --------------------------------------------------*
    */

    /*
    ^ This is used for first API wherein you can search product details using its name
    */
    app.get("/search", (req, res) => {
        // Extract searchParam from query parameters
        const searchParam = req.query.searchParam;

        // Check if searchParam is missing
        if (!searchParam) {
            return res
                .status(400)
                .json({ error: "Missing searchParam in the request body" });
        }

        // Find product with the specified productName
        const product = productsData.find(
            (p) => p.productName.toLowerCase() === searchParam.toLowerCase()
        );

        // Respond based on whether the product is found
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    });

    /*
    ^ This is used for eigth API wherein you can search product details using its id
    */
    app.get("/search_id", (req, res) => {
        // Extract id from query parameters
        let id = req.query.id;

        // Find the product with the specified productId
        const product = productsData.find((p) => p.productId == id);

        // Respond based on whether the product is found
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    });


    /*
    ^ This is used for second API wherein you need to update product database
    */
    app.put("/checkout", (req, res) => {
        // Extract id and quantity from query parameters
        const checkoutid = req.query.id;
        const checkoutquantity = req.query.quantity;

        // Check if id or quantity is missing
        if (!checkoutid || !checkoutquantity) {
            return res.status(400).json({
                error: "Missing id or quantity in the request query parameters",
            });
        }

        // Find the index of the product with the given id
        const productIndex = productsData.findIndex(
            (p) => p.productId === parseInt(checkoutid, 10)
        );

        // Respond based on whether the product is found
        if (productIndex !== -1) {
            // Update the stock of the product with the given id
            productsData[productIndex].stock -= parseInt(checkoutquantity, 10);

            // Write the updated product data back to the external JSON file
            fs.writeFileSync(
                "./db_files/products.json",
                JSON.stringify(productsData, null, 2),
                "utf8"
            );

            // Create a new order object
            let newOrder = {
                O_ID: "", // Use a function to generate a unique ID
                O_Address: "Sample Address", // Add the actual address details
                O_P_ID: checkoutid,
                O_status: "Pending", // Set the initial status
                O_totalcost: checkoutquantity * productsData[productIndex].price,
                order_quantity: checkoutquantity,
            };

            // Add the new order object to the orderData array
            orderData.push(newOrder);

            // Write the updated array back to order.json
            fs.writeFileSync("./db_files/orders.json", JSON.stringify(orderData, null, 2), "utf8");

            // Respond with success and updated data
            res.json({
                success: "Stock and order updated successfully",
                updatedProduct: productsData[productIndex],
                newOrder,
            });
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    });

    /*
    *------------------------------------ ADD , UPDATE AND DELETE PRODUCTS FROM DATABASE-------------------------------------*
    */

    /*
    ^ This is used for fourth API wherein you need to add product to database
    */
    app.post("/product", (req, res) => {
        // Extract new product details from the request body
        const newProduct = req.body;

        // Check if required fields are missing
        if (
            !newProduct ||
            !newProduct.productId ||
            !newProduct.productName ||
            !newProduct.price ||
            !newProduct.stock ||
            !newProduct.imageUrl
        ) {
            return res.status(400).json({ error: "Invalid request body" });
        }

        // Check if a product with the same productId already exists
        const existingProduct = productsData.find(
            (p) => p.productId === newProduct.productId
        );

        // Respond based on whether the product with the same productId already exists
        if (existingProduct) {
            return res
                .status(400)
                .json({ error: "Product with the same productId already exists" });
        }

        // Add the new product to the productsData array
        productsData.push(newProduct);

        // Write the updated data back to the external JSON file
        fs.writeFileSync(
            "products.json",
            JSON.stringify(productsData, null, 2),
            "utf8"
        );

        // Respond with success and new product details
        res.json({ success: "Product added successfully", newProduct });
    });

    /* 
    ^ This is used for fifth API wherein you need to update product to database
    */
    app.put("/product", (req, res) => {
        // Extract id and quantity from query parameters
        const checkoutid = req.query.id;
        const checkoutquantity = req.query.quantity;

        // Check if id or quantity is missing
        if (!checkoutid || !checkoutquantity) {
            return res.status(400).json({
                error: "Missing id or quantity in the request query parameters",
            });
        }

        // Find the index of the product with the given id
        const productIndex = productsData.findIndex(
            (p) => p.productId === parseInt(checkoutid, 10)
        );

        // Respond based on whether the product is found
        if (productIndex !== -1) {
            // Update the stock of the product with the given id
            productsData[productIndex].stock = parseInt(checkoutquantity, 10);

            // Write the updated product data back to the external JSON file
            fs.writeFileSync(
                "products.json",
                JSON.stringify(productsData, null, 2),
                "utf8"
            );

            // Respond with success and updated product details
            res.json({
                success: "Stock updated successfully",
                updatedProduct: productsData[productIndex],
            });
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    });

    /*
    ^ This is used for sixth API wherein you need to delete product to database
    */
    app.delete("/product", (req, res) => {
        // Extract id from query parameters
        const toDelete = parseInt(req.query.id, 10);

        // Check if id is invalid
        if (isNaN(toDelete)) {
            return res.status(400).json({ error: "Invalid id parameter" });
        }

        // Find the index of the product with the given ID
        const productIndex = productsData.findIndex((p) => p.productId === toDelete);

        // Respond based on whether the product is found
        if (productIndex !== -1) {
            // Remove the product from the productsData array
            productsData.splice(productIndex, 1);

            // Write the updated data back to the external JSON file
            fs.writeFileSync(
                "products.json",
                JSON.stringify(productsData, null, 2),
                "utf8"
            );

            // Respond with success
            res.json({ success: "Product deleted successfully" });
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    });


    /*
    *----------------------------------- ORDER DATABASE APIS --------------------------------------------*
    */

    /*
    ^ This is used for seventh API wherein you get add attributes order using Id
    */
    app.post("/order", (req, res) => {
        // Extract id and address from query parameters
        let checkoutid = req.query.id;
        let address = req.query.address;

        // Find the index of the order with the given O_P_ID
        const orderIndex = orderData.findIndex(
            (p) => p.O_P_ID == parseInt(checkoutid, 10)
        );

        // Respond based on whether the order is found
        if (orderIndex !== -1) {
            // Update order details
            orderData[orderIndex].O_Address = address;
            orderData[orderIndex].O_status = "pending";
            orderData[orderIndex].O_ID = uuidv4();

            // Write the updated data back to the external JSON file
            fs.writeFileSync("order.json", JSON.stringify(orderData, null, 2), "utf8");

            // Respond with success and updated order details
            res.json({
                success: "Order updated successfully",
                updatedProduct: orderData[orderIndex],
            });
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    });

    /*
    ^ This is used for seventh API wherein you get status of order using Id
    */
    app.get("/status", (req, res) => {
        // Extract orderid from query parameters
        let orderid = req.query.orderid;

        // Find the index of the order with the given O_ID
        const orderIndex = orderData.findIndex((p) => p.O_ID == orderid);

        // Respond based on whether the order is found
        if (orderIndex !== -1) {
            res.json(orderData[orderIndex].O_status);
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    });

    /*
    ^ This is used for ninth API wherein you can cancel order
    */
    app.delete("/cancel", (req, res) => {
        // Extract cancelid from query parameters
        const toDelete = req.query.cancelid;

        // Find the index of the order with the given O_ID
        const orderIndex = orderData.findIndex((order) => order.O_ID == toDelete);

        // Respond based on whether the order is found
        if (orderIndex !== -1) {
            // Retrieve the order quantity and the corresponding product ID
            const updatedQuant = orderData[orderIndex].order_quantity;
            const productId = orderData[orderIndex].O_P_ID;

            // Find the index of the product with the given productId
            const productIndex = productsData.findIndex(
                (product) => product.productId == productId
            );

            // Respond based on whether the product is found
            if (productIndex !== -1) {
                // Update the stock of the product with the given productId
                productsData[productIndex].stock += parseInt(updatedQuant, 10);

                // Write the updated product data back to the external JSON file
                fs.writeFileSync(
                    "products.json",
                    JSON.stringify(productsData, null, 2),
                    "utf8"
                );

                // Remove the order from the orderData array
                orderData.splice(orderIndex, 1);

                // Write the updated order data back to the external JSON file
                fs.writeFileSync(
                    "order.json",
                    JSON.stringify(orderData, null, 2),
                    "utf8"
                );

                // Respond with success
                res.json({ success: "Order deleted successfully" });
            } else {
                res.status(404).json({ error: "Product not found" });
            }
        } else {
            res.status(404).json({ error: "Order not found" });
        }
    });

}

module.exports = { handleMongoBackend, handleJsonBackend };