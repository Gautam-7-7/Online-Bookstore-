jest.mock("../src/models/ShippingAddress", () => ({
    countDocuments: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
    updateMany: jest.fn()
}));

const mongoose = require("mongoose");
const ShippingAddress = require("../src/models/ShippingAddress");
const {
    createShippingAddress,
    deleteShippingAddress,
    listShippingAddresses,
    setDefaultShippingAddress
} = require("../src/controllers/shippingAddressController");

const userId = new mongoose.Types.ObjectId();
const addressId = new mongoose.Types.ObjectId();
const response = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
const addressBody = {
    label: "Home",
    fullName: "Buyer Name",
    addressLine1: "1 Main Street",
    addressLine2: "",
    city: "City",
    state: "State",
    postalCode: "12345",
    country: "India",
    phone: "9876543210"
};

describe("Saved shipping addresses", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ShippingAddress.updateMany.mockResolvedValue({ modifiedCount: 0 });
    });

    test("lists only the authenticated user's addresses with default first", async () => {
        const addresses = [{ _id: addressId, label: "Home" }];
        const query = {
            sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(addresses) })
        };
        ShippingAddress.find.mockReturnValue(query);
        const res = response();

        await listShippingAddresses({ user: { id: userId } }, res);

        expect(ShippingAddress.find).toHaveBeenCalledWith({ user: userId });
        expect(res.json).toHaveBeenCalledWith({ addresses });
    });

    test("saves a complete address and automatically defaults the first one", async () => {
        ShippingAddress.countDocuments.mockResolvedValue(0);
        ShippingAddress.create.mockImplementation(async (values) => values);
        const res = response();

        await createShippingAddress(
            { user: { id: userId }, body: addressBody },
            res
        );

        expect(ShippingAddress.create).toHaveBeenCalledWith(
            expect.objectContaining({
                ...addressBody,
                user: userId,
                isDefault: true
            })
        );
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test("rejects incomplete addresses and enforces the saved-address limit", async () => {
        ShippingAddress.countDocuments.mockResolvedValue(10);
        const invalidResponse = response();
        await createShippingAddress(
            {
                user: { id: userId },
                body: { ...addressBody, city: " " }
            },
            invalidResponse
        );
        expect(invalidResponse.status).toHaveBeenCalledWith(400);

        const fullResponse = response();
        await createShippingAddress(
            { user: { id: userId }, body: addressBody },
            fullResponse
        );
        expect(fullResponse.status).toHaveBeenCalledWith(409);
        expect(ShippingAddress.create).not.toHaveBeenCalled();
    });

    test("sets a default only for an address owned by the current user", async () => {
        const address = { isDefault: false, save: jest.fn() };
        ShippingAddress.findOne.mockResolvedValue(address);
        const res = response();

        await setDefaultShippingAddress(
            {
                params: { addressId: addressId.toString() },
                user: { id: userId }
            },
            res
        );

        expect(ShippingAddress.findOne).toHaveBeenCalledWith({
            _id: addressId.toString(),
            user: userId
        });
        expect(address.isDefault).toBe(true);
        expect(address.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("removes a saved address and promotes a replacement default", async () => {
        ShippingAddress.findOneAndDelete.mockResolvedValue({
            isDefault: true
        });
        const replacement = { isDefault: false, save: jest.fn() };
        const query = {
            sort: jest.fn().mockResolvedValue(replacement)
        };
        ShippingAddress.findOne.mockReturnValue(query);
        const res = response();

        await deleteShippingAddress(
            {
                params: { addressId: addressId.toString() },
                user: { id: userId }
            },
            res
        );

        expect(ShippingAddress.findOneAndDelete).toHaveBeenCalledWith({
            _id: addressId.toString(),
            user: userId
        });
        expect(replacement.isDefault).toBe(true);
        expect(replacement.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
