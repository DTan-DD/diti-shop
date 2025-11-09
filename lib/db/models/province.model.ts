import { Schema, model, models, Document, Model } from "mongoose";

interface IWard {
  Id: string;
  Name: string;
  Level?: string;
}

interface IDistrict {
  Id: string;
  Name: string;
  type?: string;
  Wards: IWard[];
}

export interface IProvince extends Document {
  Id: string;
  Name: string;
  type?: string;
  Districts: IDistrict[];
  createdAt: Date;
  updatedAt: Date;
}

const WardSchema = new Schema<IWard>(
  {
    Id: {
      type: String,
      required: [true, "Id là bắt buộc"],
      validate: {
        validator: function (v: string) {
          return v != null && v.trim() !== "";
        },
        message: "Id không được để trống",
      },
    },
    Name: {
      type: String,
      required: [true, "Name là bắt buộc"],
      validate: {
        validator: function (v: string) {
          return v != null && v.trim() !== "";
        },
        message: "Name không được để trống",
      },
    },
    Level: String,
  },
  { _id: false }
);

const DistrictSchema = new Schema<IDistrict>(
  {
    Id: { type: String, required: true },
    Name: { type: String, required: true },
    type: String,
    Wards: {
      type: [WardSchema],
      default: [],
      validate: {
        validator: function (wards: IWard[]) {
          // Nếu có Wards thì mỗi Ward phải có Id và Name
          return wards.every((ward) => ward && ward.Id && ward.Name && ward.Id.trim() !== "" && ward.Name.trim() !== "");
        },
        message: "Mỗi Ward phải có Id và Name hợp lệ",
      },
    },
  },
  { _id: false }
);

const ProvinceSchema = new Schema<IProvince>(
  {
    Id: { type: String, required: true, unique: true },
    Name: { type: String, required: true },
    type: String,
    Districts: { type: [DistrictSchema], default: [] },
  },
  { timestamps: true }
);

const Province = (models.Province as Model<IProvince>) || model<IProvince>("Province", ProvinceSchema);

export default Province;
